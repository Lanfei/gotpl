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
						'./src/gotpl.min.js': './src/gotpl.js'
					}
				}
			}
		});

		grunt.task.run(['uglify']);
	});
};