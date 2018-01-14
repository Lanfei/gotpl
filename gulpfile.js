var gulp = require('gulp');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');

gulp.task('default', function () {
	return gulp
		.src('lib/gotpl.js')
		.pipe(uglify({
			preserveComments: 'license'
		}))
		.pipe(rename({
			suffix: '.min'
		}))
		.pipe(gulp.dest('lib'));
});
