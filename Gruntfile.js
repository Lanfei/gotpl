module.exports = function(grunt) {

	grunt.loadNpmTasks('grunt-contrib-uglify');

	grunt.registerTask('default', function() {

		grunt.initConfig({
			pkg: grunt.file.readJSON('package.json'),
			uglify: {
				default: {
					options: {
						// sourceMap: true,
						banner: '/*! <%= pkg.name %> <%= pkg.version %> | <%= pkg.description %> */\n'
					},
					files: {
						'./lib/gotpl.min.js': './lib/gotpl.js'
					}
				}
			}
		});

		grunt.task.run(['uglify']);
	});
};