'use strict';
const Generator = require('yeoman-generator');
const chalk = require('chalk');
const yosay = require('yosay');
var _ = require('lodash');
var mkdirp = require('mkdirp');

const phpImages = {
  vanilla: [
    {value: 'wodby/drupal:8-7.1-2.4.4', name: 'Drupal 8 - PHP 7.1'},
    {value: 'wodby/drupal:8-7.0-2.4.4', name: 'Drupal 8 - PHP 7.0'},
    {value: 'wodby/drupal:7-7.1-2.4.4', name: 'Drupal 7 - PHP 7.1'},
    {value: 'wodby/drupal:7-7.0-2.4.4', name: 'Drupal 7 - PHP 7.0'},
    {value: 'wodby/drupal:7-5.6-2.4.4', name: 'Drupal 7 - PHP 5.6'},
  ],
  custom: [
    {value: 'wodby/drupal-php:7.1-2.4.3', name: 'PHP 7.1'},
    {value: 'wodby/drupal-php:7.0-2.4.3', name: 'PHP 7.0'},
    {value: 'wodby/drupal-php:5.6-2.4.3', name: 'PHP 5.6'},
  ]
};

const nginxImages = {
  D8: 'wodby/drupal-nginx:8-1.13-2.4.2',
  D7: 'wodby/drupal-nginx:7-1.13-2.4.2'
};

module.exports = class extends Generator {
  prompting() {
    // Have Yeoman greet the user.

    this.log('                                             ');
    this.log('                      `/.                    ');
    this.log('                      /yys+-                 ');
    this.log('                   `:syyyyyys/.              ');
    this.log('                `:oyyyyyyyyyyyys/`           ');
    this.log('              .+yyyyyyyyyyyyyyyyyy+.         ');
    this.log('            `+yyyyyyyyyyyyyyyyyyyyyy/        ');
    this.log('           `oyyyyyyyyyyyyyyyyyyyyyyyyo`      ');
    this.log('           +yyyyyyyyyyyyyyyyyyyyyyyyyy+      ');
    this.log('          .yyyyyyyyyyyyyyyyyyyyyyyyyyyy.     ');
    this.log('          :yyyyyyyys+//+oyyyyyyyyysosyy:     ');
    this.log('          -yyyyyys.       .+yyyo:`   .y-     ');
    this.log('           syyyyy-          `/.       o      ');
    this.log('           .yyyyy+        `:sy/      /.      ');
    this.log('            .syyyys:...-/oyo/:ss/--/o.       ');
    this.log('             `/yyyyyyyyy/osyyyosyyy/`        ');
    this.log('               `:oyyyyyys/:://oyo:`          ');
    this.log('                  `-:+oossoo+:-`             ');
    this.log('                                             ');
    this.log(yosay(
      'Welcome to the ' + chalk.yellow('Docker4Drupal') + ' generator!'
    ));

    const prompts = [{
      type: 'list',
      name: 'genType',
      message: 'What kind of Drupal Docker you want?',
      choices: [
        {
          value: 'vanilla',
          name: 'Run Vanilla Drupal from Image'
        },
        {
          value: 'custom',
          name: 'Mount my Drupal Codebase'
        }
      ]
    },
    {
      type: 'list',
      name: 'phpImage',
      message: 'Docker PHP Image',
      choices: phpImages.vanilla,
      when: function (answers) {
        return answers.genType === 'vanilla';
      }
    },
    {
      type: 'list',
      name: 'phpImage',
      message: 'Docker PHP Image',
      choices: phpImages.custom,
      when: function (answers) {
        return answers.genType === 'custom';
      }
    },
    {
      type: 'list',
      name: 'drupalVersion',
      message: 'Drupal Version',
      choices: [
        {value: "D8", name: "Drupal 8"},
        {value: "D7", name: "Drupal 7"}
      ],
      when: function (answers) {
        return answers.genType === 'custom';
      }
    },
    {
      name: 'siteName',
      message: 'What is your drupal site name?',
      default: _.startCase(this.appname)
    },
    {
      name: 'siteMachineName',
      message: 'What is your drupal site machine name? EX: d8',
      default: function (answers) {
        // Default to snake case theme name
        return _.snakeCase(answers.siteName);
      }
    },
    {
      name: 'domain',
      message: 'What is your drupal site domain? Ex: drupal.docker.localhost',
      default: function (answers) {
        return `${answers.siteMachineName}.docker.localhost`
      }
    }];

    return this.prompt(prompts).then(props => {
      this.props = props;
    });
  }

  writing() {
    var drupalVersion = "D8"
    if (this.props.genType == 'vanilla') {
      drupalVersion = 'D' + this.props.phpImage.match(/^wodby\/drupal:([7-8])-/)[1];
    } else {
      drupalVersion = this.props.drupalVersion
    }

    this.fs.copyTpl(
      this.templatePath('docker-compose.yml'),
      this.destinationPath('docker/docker-compose.yml'),
      {
        domain: this.props.domain,
        instance: this.props.siteMachineName,
        phpImage: this.props.phpImage,
        nginxImage: nginxImages[drupalVersion]
      }
    );
    this.fs.copyTpl(
      this.templatePath('docker-sync.yml'),
      this.destinationPath('docker/docker-sync.yml'),
      {
        instance: this.props.siteMachineName
      }
    );
    this.fs.copyTpl(
      this.templatePath('docker4drupal.sh'),
      this.destinationPath('docker4drupal.sh'),
      {
        instance: this.props.siteMachineName,
        siteName: this.props.siteName,
        domain: this.props.domain,
        genType: this.props.genType
      }
    );
    // Only for D8.
    if (drupalVersion === 'D8') {
      this.fs.copy(
        this.templatePath('D8/development.services.yml'),
        this.destinationPath('docker/examples/development.services.yml')
      );
      this.fs.copyTpl(
        this.templatePath('D8/settings.local.php'),
        this.destinationPath('docker/examples/settings.local.php'),
        {
          domain: this.props.domain,
          instance: this.props.siteMachineName
        }
      );
    }
    mkdirp('docroot');
    mkdirp('certs');
  }

  install() {
    this.spawnCommand('openssl', ['req', '-x509', '-nodes', '-days', '365', '-newkey', 'rsa:2048', '-subj', '/C=UK/ST=Drupal/L=Mars/O=Dis/CN=' + this.props.domain, '-keyout', 'certs/key.pem', '-out', 'certs/cert.pem']);
    this.log('Docker and Drupal related files generated.')
  }
};
