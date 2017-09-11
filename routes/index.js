'use strict';

const router = require('koa-router')();

router.get('/',function(ctx) {
  ctx.body = "Hello world";
})

module.exports = router.middleware();
