var gulp = require('gulp'),
    gls = require('gulp-live-server');

    
gulp.task('server', function() {
    var options = {
        cwd: undefined
    };
    options.env = process.env;
    var server = gls('bin/www', options, 35729);
    server.start();

    gulp.watch([
        '.env',
        'config*.js',
        'bin/*',
        'server/**/*.js*'
    ], function() {
        server.start();
    });
    gulp.watch([
        'client/assets/**/*.css',
        'client/assets/**/*.js',
        'server/views/**/*.hbs'
    ], function() {
        server.notify.apply(server, arguments);
    });
});

gulp.task('default', ['server'], function() {});
