/*
 * grunt-cucumberjs
 * https://github.com/mavdi/grunt-cucumberjs
 *
 * Copyright (c) 2013 Mehdi Avdi
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {

  var version = grunt.file.readJSON('./package.json').version;
  var projectPkg = grunt.file.readJSON('package.json');
  var spawn = require('child_process').spawn;
  var _ = require('underscore');

  grunt.registerMultiTask('cucumberjs', 'Run cucumber.js features', function () {
    var done = this.async();

    var options = this.options({
      output: 'features_report.html',
      format: 'html',
      theme: 'foundation',
      templateDir: 'features/templates',
      tags: ''
    });

    // resolve options set via cli
    for (var key in options) {
      if (options.hasOwnProperty(key)) {
        if (grunt.option(key)) {
          options[key] = grunt.option(key);
        }
      }
    }

    var commands = [];

    if (options.steps) {
      commands.push('-r', options.steps);
    }

    // quick and dirty support for multiple tag arguments
    var tagsOption = false;
    options.tags = [];
    process.argv.forEach(function (val) {
      if (val === '-t' || val === '--tags')
      {
        tagsOption = true;
      } else {
        if (tagsOption) {
          options.tags.push(val);
          tagsOption = false;
        }
      }
    });

    options.tags.forEach(function(tag) {
      commands.push('-t', tag);
    });

    if (options.format === 'html') {
      commands.push('-f', 'json');
    } else {
      commands.push('-f', options.format);
    }

    if (grunt.option('features')) {
      commands.push(grunt.option('features'));
    } else {
      this.files.forEach(function (f) {
        f.src.forEach(function (filepath) {
          if (!grunt.file.exists(filepath)) {
            grunt.log.warn('Source file "' + filepath + '" not found.');
            return;
          }

          commands.push(filepath);
        });
      });
    }

    var buffer = [];
    var cucumber;
    if (process.platform === 'win32') {
      cucumber = spawn('.\\node_modules\\.bin\\cucumber-js.cmd', commands);
    } else {
      cucumber = spawn('./node_modules/.bin/cucumber-js', commands);
    }

    cucumber.stdout.on('data', function (data) {
      if (options.format === 'html' || options.format === 'json') {
        buffer.push(data);
      } else {
        grunt.log.write(data);
      }
    });

    cucumber.stderr.on('data', function (data) {
      var stderr = new Buffer(data);
      grunt.log.error(stderr.toString());
    });

    cucumber.on('close', function (code) {

      if (options.format === 'html' || options.format === 'json') {
        var featureJsonOutput;
  
        var output = Buffer.concat(buffer).toString();
  
        var featureStartIndex = output.substring(0, output.indexOf('"keyword": "Feature"')).lastIndexOf('[');
  
        var logOutput = output.substring(0, featureStartIndex - 1);
  
        var featureOutput = output.substring(featureStartIndex);
  
        try {
          featureJsonOutput = JSON.parse(featureOutput);
        } catch (e) {
          grunt.log.error('Unable to parse cucumberjs output into json.');
  
          return done(false);
        }
  
        generateReport(featureJsonOutput, logOutput);
      }
      
      if (code !== 0) {
        grunt.log.error('failed tests, please see the output');

        return done(false);
      } else {
        return done();
      }
    });

    /**
     * Adds passed/failed properties on features/scenarios
     *
     * @param {object} suite The test suite object
     */
    var setStats = function (suite) {
      var features = suite.features;

      features.forEach(function (feature) {
        feature.passed = 0;
        feature.failed = 0;
        feature.duration = 0;

        if (!feature.elements) {
          return;
        }

        //remove Background from reports: https://github.com/mavdi/grunt-cucumberjs/issues/10
        for (var i = feature.elements.length - 1; i >= 0; i--) {
          if (feature.elements[i].type === 'background') {
            feature.elements.splice(i, 1);
          }
        }
        
        feature.elements.forEach(function (element) {
          element.passed = 0;
          element.failed = 0;
          element.notdefined = 0;
          element.skipped = 0;
          element.duration = 0;
          
          if (feature.tags) {
            element.featureTags = [];
            feature.tags.forEach(function (tag) {
              element.featureTags.push(tag);
            });
          }

          element.steps.forEach(function (step) {
            element.duration += (step.result.duration || 0);
            
            if (step.result.status === 'passed') {
              return element.passed++;
            }
            if (step.result.status === 'failed') {
              return element.failed++;
            }
            if (step.result.status === 'undefined') {
              return element.notdefined++;
            }

            element.skipped++;
          });
          
          feature.duration += element.duration;

          if (element.failed > 0) {
            return feature.failed++;
          }
          feature.passed++;
        });

        if (feature.failed > 0) {
          return suite.failed++;
        }
        suite.passed++;
      });

      suite.features = features;

      return suite;
    };

    /**
     * Returns the path of a template
     *
     * @param {string} name The template name
     */
    var getPath = function (name) {
      var path = require('path').resolve(__dirname, '../templates') + '/' + options.theme + '/' + name;

      // return the users custom template if it has been defined
      if (grunt.file.exists(options.templateDir + '/' + name)) {
        path = options.templateDir + '/' + name;
      }

      return path;
    };

    /**
     * Generate html report
     *
     * @param {object} featureOutput Features result object
     * @param {string} logOutput Contains any console statements captured during the test run
     */
    var generateReport = function (featureOutput, logOutput) {
      var suite = {
        name: projectPkg.name,
        date: new Date(),
        features: featureOutput,
        passed: 0,
        failed: 0,
        logOutput: logOutput,
        tags: options.tags
      };

      suite = setStats(suite);

      if (options.format === 'html') {
        grunt.file.write(
          options.output,
          _.template(grunt.file.read(getPath('index.tmpl')))({
            suite: suite,
            version: version,
            time: new Date(),
            features: _.template(grunt.file.read(getPath('features.tmpl')))({suite: suite, _: _ }),
            styles: grunt.file.read(getPath('style.css')),
            script: grunt.file.read(getPath('script.js'))
          })
        );

        grunt.log.writeln('Generated ' + options.output + ' successfully.');
      } else if (options.format === 'json') {
        grunt.file.write(options.output, JSON.stringify(suite));
      }

    };
  });
};
