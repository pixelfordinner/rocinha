'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var rename = require('gulp-rename');
var sass = require('gulp-sass');
var jade = require('gulp-jade');
var gdata = require('gulp-data');
var imagemin = require('gulp-imagemin');
var svgstore = require('gulp-svgstore');
var pngquant = require('imagemin-pngquant');
var pleeease = require('gulp-pleeease');
var plumber = require('gulp-plumber');
var notify = require('gulp-notify');
var del = require('del');
var watchify = require('watchify');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var jscs = require('gulp-jscs');
var stylish = require('gulp-jscs-stylish');
var jshint = require('gulp-jshint');
var gulpif = require('gulp-if');
var browserSync = require('browser-sync');
var reload = browserSync.reload;

// Config

var paths = {
  base: {
    root: __dirname,
    src: 'src',
    dev: 'builds/dev',
    dist: 'builds/dist'
  },
  assets: {
    styles: {
      sass: {
        path: '/assets/styles/sass',
        out: '/assets/styles',
        files: '/**/*.{scss,sass}',
        includePaths: [
            '/assets/styles/sass/node_modules',
            '/assets/styles/sass/bower_components',
            'node_modules',
            'bower_components'
        ]
      }
    },
    scripts: {
      js: {
        path: '/assets/scripts/js',
        out: {
          path: '/assets/scripts',
          file: 'bundle.js'
        },
        entry: '/index.js',
        files: '/**/*.js',
        includePaths: [
            './node_modules',
            './bower_components',
            './../../../node_modules',
            './../../../bower_components'
        ]
      }
    },
    images: {
      path: '/assets/images',
      out: '/assets/images',
      files: '/**/*.{jpg,gif,png,svg}'
    },
    favicons: {
      path: '/assets/favicons',
      out: '/assets/favicons',
      files: {
        imagemin: '/**/*.{png,svg,gif}',
        copy: '/**/*.{xml,txt,json,ico}'
      }
    },
    icons: {
      path: '/assets/icons',
      out: {
        path: '/assets/icons',
        file: 'symbols.svg'
      },
      files: '/**/*.svg'
    }
  },
  templates: {
    jade: {
      path: '/templates/jade',
      out: '/',
      files: {
        watch: '/**/*.jade',
        compile: '/*.jade'
      }
    }
  },
  data: {
    clean: {
      init: true
    },
    templates: {
      jade: '/data/jade.json'
    }
  }
};

var options = {
  dev: {
    sass: {
      errLogToConsole: true,
      sourceComments: true,
      includePaths: paths.assets.styles.sass.includePaths,
      outputStyle: 'expanded'
    },
    pleeease: {
      autoprefixer: {
        browsers: ['last 2 versions', 'ie 9']
      },
      minifier: false,
      filters: true,
      rem: true,
      pseudoElements: true,
      opacity: true
    },
    jade: {
      pretty: true
    },
    browserify: {
      entries: paths.base.src +
        paths.assets.scripts.js.path +
        paths.assets.scripts.js.entry,
      paths: paths.assets.scripts.js.includePaths,
      debug: true
    },
    jshint: {
      config: '.jshintrc'
    },
    jscs: {
      configPath: '.jscsrc'
    },
    imagemin: {
      optimizationLevel: 0,
      svgoPlugins: [
          {removeViewBox: false},
          {removeUselessStrokeAndFill: false}
      ]
    },
    svgo: {
      plugins: [
          {removeViewBox: false},
          {removeUselessStrokeAndFill: false}
      ]
    }
  },
  dist: {
    sass: {
      errLogToConsole: true,
      sourceComments: false,
      includePaths: paths.assets.styles.sass.includePaths
    },
    pleeease: {
      autoprefixer: {
        browsers: ['last 10 versions', 'ie 9']
      },
      minifier: true,
      mqpacker: true,
      filters: true,
      rem: true,
      pseudoElements: true,
      opacity: true
    },
    jade: {
      pretty: true
    },
    browserify: {
      entries: paths.base.root + '/' + paths.base.src +
        paths.assets.scripts.js.path + paths.assets.scripts.js.entry,
      paths: paths.assets.scripts.js.includePaths
    },
    jshint: {
      config: '.jshintrc'
    },
    jscs: {
      configPath: '.jscsrc'
    },
    imagemin: {
      optimizationLevel: 8,
      progressive: true,
      interlaced: true,
      multipass: true,
      svgoPlugins: [
          {removeViewBox: false},
          {removeUselessStrokeAndFill: false}
      ],
      use: [pngquant()]
    },
    svgo: {
      multipass: true,
      plugins: [
          {removeViewBox: false},
          {removeUselessStrokeAndFill: false}
      ]
    }
  }
};

var env = {
  production: false,
  build: paths.base.dev,
  options: options.dev
};

// Functions

function handleError(task) {
  return function(err) {
    gutil.log(gutil.colors.red(err));
    notify.onError(task + ' failed, check the logs..')(err);
    this.emit('end');
  };
}

// Tasks

// Styles

// Sass

gulp.task('sass', ['clean'], function () {
  gulp.src(paths.base.src +
    paths.assets.styles.sass.path +
    paths.assets.styles.sass.files)
      .pipe(sass(env.options.sass))
        .on('error', handleError('sass'))
      .pipe(pleeease(env.options.pleeease))
      .pipe(gulp.dest(env.build + paths.assets.styles.sass.out))
      .pipe(reload({stream:true}));
});

// Templates

// Jade

gulp.task('jade', ['clean'], function () {
  // Allows to import both a JSON file and local variables into Jade.
  // Also enables using local variables into static json file through lodash.
  var compileDataTemplate = function () {
    var file = paths.base.src + paths.data.templates.jade;
    var contents = '';
    var pkg = {};

    try {
      contents = fs.readFileSync(file);
      pkg = require('./package.json');
    } catch (err) {
      if (err.code === 'ENOENT') {
        gutil.log('File not found: ' +
            paths.base.src +
            paths.data.templates.jade);
        return {paths: paths, env: env};
      }
    }

    var obj = JSON.parse(contents);
    var compile = _.template(contents);

    var locals = {paths: paths, env: env, pkg: pkg};
    var compiled = JSON.parse(compile(_.assign({}, locals, obj)));

    return _.assign({}, compiled, locals);
  };

  var locals = compileDataTemplate();

  gulp.src(paths.base.src +
    paths.templates.jade.path +
    paths.templates.jade.files.compile)
      .pipe(plumber())
      .pipe(gdata(locals))
      .pipe(jade(env.options.jade))
      .pipe(gulp.dest(env.build + paths.templates.jade.out))
      .pipe(reload({stream: true}));
});

// Scripts

// JSCS + JSHINT

function jsLint(taskName, files) {
  return gulp.src(files)
    .pipe(jshint(env.options.jshint.config))
    .pipe(jscs(env.options.jscs))
    .on('error', handleError(taskName))
    .pipe(stylish.combineWithHintResults())
    .pipe(jshint.reporter('jshint-stylish'));
}

gulp.task('js:lint', function () {
  jsLint('js:lint', paths.base.src +
    paths.assets.scripts.js.path +
    paths.assets.scripts.js.files);
});

// Browserify

gulp.task('js', ['clean'], function () {
  var b = env.production === true ?
    browserify(options.dist.browserify) :
    watchify(browserify(
      _.assign({},
      watchify.args,
      options.dev.browserify))
  );

  var bundle = function () {
    jsLint('js', paths.base.src +
      paths.assets.scripts.js.path +
      paths.assets.scripts.js.files);

    return b.bundle()
      .on('error', handleError('js'))
      .pipe(source(paths.assets.scripts.js.out.file))
      .pipe(buffer())
      .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(gulpif(env.production === true, uglify()))
        .on('error', handleError('js'))
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest(env.build + paths.assets.scripts.js.out.path))
      .pipe(reload({stream:true}));
  };

  if (env.production !== true) {
    b.on('update', bundle);
    b.on('log', gutil.log);
  }

  return bundle();
});

// Images

// Imagemin

gulp.task('imagemin', ['clean'], function () {
  gulp.src(paths.base.src +
    paths.assets.images.path +
    paths.assets.images.files)
      .pipe(imagemin(env.options.imagemin))
      .pipe(gulp.dest(env.build + paths.assets.images.out))
      .pipe(reload({stream:true}));
});

// Icons

// SVG

gulp.task('svg', ['clean'], function () {
  gulp.src(paths.base.src + paths.assets.icons.path + paths.assets.icons.files)
    .pipe(imagemin(env.options.imagemin))
      .pipe(rename(function (file) {
        var name = file.dirname !== '.' ? file.dirname.split(path.sep) : [];
        name.push(file.basename);
        file.basename = name.join('-').toLocaleLowerCase();
      }))
      .pipe(svgstore())
      .pipe(rename(paths.assets.icons.out.file))
      .pipe(gulp.dest(env.build + paths.assets.icons.out.path));
});

// Favicons

gulp.task('favicons', ['clean'], function () {
  // Copy non-icon files
  gulp.src(paths.base.src +
    paths.assets.favicons.path +
    paths.assets.favicons.files.copy)
      .pipe(gulp.dest(env.build + paths.assets.favicons.out));

  // Pass all icons/images through imagemin
  gulp.src(paths.base.src +
    paths.assets.favicons.path +
    paths.assets.favicons.files.imagemin)
      .pipe(imagemin(env.options.imagemin))
      .pipe(gulp.dest(env.build + paths.assets.favicons.out))
      .pipe(reload({stream: true}));
});

// Servers

// BrowserSync

gulp.task('browsersync', ['build'], function () {
  browserSync({
    server: {
      baseDir: env.build
    },
    https: true
  });
});

// Build tasks

gulp.task('styles', ['sass']);
gulp.task('scripts', ['js']);
gulp.task('images', ['imagemin']);
gulp.task('icons', ['svg', 'favicons']);
gulp.task('templates', ['jade']);

gulp.task('clean', function (cb) {

  if (paths.data.clean.init === true) {
    del([env.build + '/**'], cb);
    gutil.log('Cleaned build directory.');
    paths.data.clean.init = false;
  } else {
    cb();
  }
});

gulp.task('build', ['styles', 'scripts', 'images', 'icons', 'templates']);

// Watch tasks

gulp.task('watch:styles', function () {
  gulp.watch(paths.base.src +
    paths.assets.styles.sass.path +
    paths.assets.styles.sass.files, ['sass']);
});

gulp.task('watch:images', function () {
  gulp.watch(paths.base.src +
    paths.assets.images.path +
    paths.assets.images.files, ['imagemin']);
});

gulp.task('watch:icons', function () {
  gulp.watch(paths.base.src +
    paths.assets.icons.path +
    paths.assets.icons.files, ['svg']);

  gulp.watch(paths.base.src +
    paths.assets.favicons.path +
    paths.assets.favicons.files, ['favicons']);
});

gulp.task('watch:templates', function () {
  gulp.watch(paths.base.src +
    paths.templates.jade.path +
    paths.templates.jade.files.watch, ['jade']);

  gulp.watch(paths.base.src +
    paths.data.templates.jade, ['jade']);
});

gulp.task('watch', ['watch:styles',
    'watch:images',
    'watch:icons',
    'watch:templates']);

// Env Tasks

gulp.task('env:dist', function () {
  env.build = paths.base.dist;
  env.options = options.dist;
  env.production = true;
});

// Main tasks

// Dev

gulp.task('dev', ['browsersync', 'watch']);

// Dist

gulp.task('dist', ['env:dist', 'build']);
gulp.task('dist:server', ['env:dist', 'browsersync']);

// Default

gulp.task('default', ['dev']);
