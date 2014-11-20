module.exports = function(grunt) {

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json')
	});

	grunt.loadNpmTasks('grunt-contrib-uglify');

	grunt.registerTask('default', function() {

		grunt.initConfig({
			uglify: {
				options: {
					mangle: {
						// Important!
						except: ['require']
					}
				},
				default: {
					files: {
						'./src/gotpl.min.js': './src/gotpl.js'
					}
				}
			}
		});

		grunt.task.run(['uglify']);
	});
};