const gulp = require('gulp');
const shell = require('gulp-shell');
const rimraf = require('rimraf');
const run = require('run-sequence');
const watch = require('gulp-watch');
const server = require('gulp-live-server');


const paths = {
	js: ['./routes/**/*.js','./app.js'],
	dest: './dist/'
};

gulp.task('dev', cb => {
	run('server', 'rebuild', 'watch', cb);
});

gulp.task('build', cb => {
	run('clean', 'babel', cb);
});

gulp.task('rebuild', cb => {
	run('build', 'restart', cb);
});

gulp.task('clean', cb => {
	rimraf(paths.dest, cb);
});

gulp.task('babel', shell.task([
  `babel routes --out-dir ${paths.dest}routes`,
  `babel app.js --out-dir ${paths.dest}`,
]));

// gulp.task('server', () => {
//   nodemon({
//      script: `${paths.dest}index.js`
//   }).on('restart', function () {
//       console.log('restarted!');
//     });
// });

let express;

gulp.task('server', () => {
	express = server.new(`${paths.dest}app`);
});

gulp.task('restart', () => {
	express.start.bind(express)();
});

gulp.task('watch', () => {
	return watch(paths.js, () => {
		gulp.start('rebuild');
	});
});
