'use strict';

const config = require("config");

const Koa      = require('koa');            // Koa framework
const body     = require('koa-body');       // body parser
const routes = require('./routes/index');


const app = new Koa();

// trust proxy
app.proxy = true;

app.keys = [config.site.secret];

// parse request body into ctx.request.body
app.use(body());
app.use(routes);

app.use(async function (ctx,next) {
	try {
		await next();

	} catch (err) {
		console.log(err);
	}
});



app.listen(config.site.port || "3000");
console.log(`${config.site.name} is now listening on port ${config.site.port}`);

process.on("SIGINT", function exit() {
	process.exit();
});

module.exports = app;
