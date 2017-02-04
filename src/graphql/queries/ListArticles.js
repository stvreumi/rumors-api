import {
  GraphQLInt,
} from 'graphql';

import {
  getFilterableType,
  getSortableType,
  getSortArgs,
  getPagedType,
  getCursor,
  getSearchAfterFromCursor,
  pagingArgs,
  getArithmeticExpressionType,
  getOperatorAndOperand,
} from 'graphql/util';

import getIn from 'util/getInFactory';

import client, { processMeta } from 'util/client';
import Article from 'graphql/models/Article';

export default {
  // type: new GraphQLList(Article),
  type: getPagedType('ArticleResult', Article, {
    async resolveEdges(searchContext) {
      const nodes = getIn(await client.search(searchContext))(['hits', 'hits'], []).map(processMeta);

      return nodes.map(node => ({
        node,
        cursor: getCursor(searchContext.sort, node),
      }));
    },
    async resolvePageInfo(searchContext) {

    },
  }),
  args: {
    filter: {
      type: getFilterableType('ListArticleFilter', {
        replyCount: { type: getArithmeticExpressionType('ListArticleReplyCountExpr', GraphQLInt) },
      }),
    },
    orderBy: {
      type: getSortableType('ListArticleOrderBy', [
        'updatedAt',
        'createdAt',
      ]),
    },
    ...pagingArgs,
  },
  async resolve(rootValue, { filter = {}, orderBy = [], first, after }) {
    const body = {
      query: {
        // Ref: http://stackoverflow.com/a/8831494/1582110
        //
        match_all: {},
      },
    };

    if (after) {
      body.search_after = getSearchAfterFromCursor(after);
    }

    if (filter.replyCount) {
      // Switch to bool query so that we can filter more_like_this results
      //
      const { operator, operand } = getOperatorAndOperand(filter.replyCount);
      body.query = {
        bool: {
          must: body.query,
          filter: { script: { script: {
            inline: `doc['replyIds'].length ${operator} params.operand`,
            params: {
              operand,
            },
          } } },
        },
      };
    }

    // should return search context for resolveEdges & resolvePageInfo
    return {
      index: 'articles',
      type: 'basic',
      body,
      sort: getSortArgs(orderBy),
      size: first,
    };
  },
};
