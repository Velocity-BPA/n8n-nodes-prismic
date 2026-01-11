const { src, dest } = require('gulp');
const rename = require('gulp-rename');

function buildIcons() {
  return src('nodes/**/*.svg')
    .pipe(
      rename((path) => {
        path.dirname = path.dirname.replace('nodes/', '');
      }),
    )
    .pipe(dest('dist/nodes/'));
}

exports['build:icons'] = buildIcons;
