'use strict';
const Generator = require('yeoman-generator');
const chalk = require('chalk');
const yosay = require('yosay');
var _ = require('lodash');
var mkdirp = require('mkdirp');
var sleep = require('sleep');

const phpImages = {
  vanilla: [
    {value: 'wodby/drupal:8-7.1-3.3.2', name: 'Drupal 8 - PHP 7.1'},
    {value: 'wodby/drupal:7-7.1-3.3.2', name: 'Drupal 7 - PHP 7.1'},
    {value: 'wodby/drupal:7-5.6-3.3.2', name: 'Drupal 7 - PHP 5.6'}
  ],
  custom: [
    {value: 'wodby/drupal-php:7.1-3.3.1', name: 'PHP 7.1'},
    {value: 'wodby/drupal-php:7.0-3.3.1', name: 'PHP 7.0'},
    {value: 'wodby/drupal-php:5.6-3.3.1', name: 'PHP 5.6'}
  ]
};

const nginxImages = {
  D8: 'wodby/drupal-nginx:8-1.13-3.0.2',
  D7: 'wodby/drupal-nginx:7-1.13-3.0.2'
};

module.exports = class extends Generator {
  prompting() {
    // Have Yeoman greet the user.
    this.log('\x1Bc');
    this.log(chalk.cyan('                                           '));
    this.log(chalk.cyan('                    `/.                    '));
    this.log(chalk.cyan('                    /yys+-                 '));
    this.log(chalk.cyan('                 `:syyyyyys/.              '));
    this.log(chalk.cyan('              `:oyyyyyyyyyyyys/`           '));
    this.log(chalk.cyan('            .+yyyyyyyyyyyyyyyyyy+.         '));
    this.log(chalk.cyan('          `+yyyyyyyyyyyyyyyyyyyyyy/        '));
    this.log(chalk.cyan('         `oyyyyyyyyyyyyyyyyyyyyyyyyo`      '));
    this.log(chalk.cyan('         +yyyyyyyyyyyyyyyyyyyyyyyyyy+      '));
    this.log(chalk.cyan('        .yyyyyyyyyyyyyyyyyyyyyyyyyyyy.     '));
    this.log(chalk.cyan('        :yyyyyyyys+//+oyyyyyyyyysosyy:     '));
    this.log(chalk.cyan('        -yyyyyys.       .+yyyo:`   .y-     '));
    this.log(chalk.cyan('         syyyyy-          `/.       o      '));
    this.log(chalk.cyan('         .yyyyy+        `:sy/      /.      '));
    this.log(chalk.cyan('          .syyyys:...-/oyo/:ss/--/o.       '));
    this.log(chalk.cyan('           `/yyyyyyyyy/osyyyosyyy/`        '));
    this.log(chalk.cyan('             `:oyyyyyys/:://oyo:`          '));
    this.log(chalk.cyan('                `-:+oossoo+:-`             '));
    this.log(chalk.cyan('                                           '));

    this.log(yosay(
      'Welcome to the ' + chalk.yellow('docker4drupal') + ' generator!'
    ));

    const prompts = [{
      type: 'list',
      name: 'genType',
      message: 'docker4drupal codebase? ',
      choices: [
        {
          value: 'vanilla',
          name: 'Downloads Drupal using docker4drupal defaults'
        },
        {
          value: 'custom',
          name: 'Run Drupal from an existing codebase'
        }
      ]
    },
    {
      type: 'list',
      name: 'phpImage',
      message: 'Docker PHP Image? ',
      choices: phpImages.vanilla,
      when: function (answers) {
        return answers.genType === 'vanilla';
      }
    },
    {
      type: 'list',
      name: 'phpImage',
      message: 'Docker PHP Image? ',
      choices: phpImages.custom,
      when: function (answers) {
        return answers.genType === 'custom';
      }
    },
    {
      type: 'list',
      name: 'drupalVersion',
      message: 'Drupal Version? ',
      choices: [
        {value: 'D8', name: 'Drupal 8'},
        {value: 'D7', name: 'Drupal 7'}
      ],
      when: function (answers) {
        return answers.genType === 'custom';
      }
    },
    {
      name: 'siteName',
      message: 'What is your drupal site name? ',
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
        return `${answers.siteMachineName}.docker.localhost`;
      }
    },
    {
      name: 'httpPort',
      message: 'http port? Ex: 80, 8081, 8082',
      default: '80'
    },
    {
      name: 'httpsPort',
      message: 'https port? Ex: 443, 8443, 9443',
      default: '443'
    },
    {
      type: 'list',
      name: 'solr',
      message: 'Enable Apache SOLR? ',
      choices: [
        {
          value: '',
          name: 'Yes'
        },
        {
          value: '#',
          name: 'No'
        }
      ]
    },
    {
      type: 'list',
      name: 'redis',
      message: 'Enable Redis? ',
      choices: [
        {
          value: '',
          name: 'Yes'
        },
        {
          value: '#',
          name: 'No'
        }
      ]
    }];

    return this.prompt(prompts).then(props => {
      this.props = props;
    });
  }

  writing() {
    var drupalVersion = 'D8';
    if (this.props.genType === 'vanilla') {
      drupalVersion = 'D' + this.props.phpImage.match(/^wodby\/drupal:([7-8])-/)[1];
    } else {
      drupalVersion = this.props.drupalVersion;
    }

    this.fs.copyTpl(
      this.templatePath('docker-compose.yml'),
      this.destinationPath('docker/docker-compose.yml'),
      {
        domain: this.props.domain,
        instance: this.props.siteMachineName,
        phpImage: this.props.phpImage,
        nginxImage: nginxImages[drupalVersion],
        httpPort: this.props.httpPort,
        httpsPort: this.props.httpsPort,
        solr: this.props.solr,
        redis: this.props.redis
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
        genType: this.props.genType,
        version: drupalVersion
      }
    );
    // Drush helper script.
    this.fs.copyTpl(
      this.templatePath('drush.sh'),
      this.destinationPath('docker/drush.sh'),
      {
        instance: this.props.siteMachineName
      }
    );
    // Mysql helper script.
    this.fs.copyTpl(
      this.templatePath('mysql.sh'),
      this.destinationPath('docker/mysql.sh'),
      {
        instance: this.props.siteMachineName
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
    sleep.sleep(5);
    this.log(chalk.green('\nDocker and Drupal related files generated.'));
    this.log(chalk.bold.yellow('Run ./docker4drupal.sh for list of available commands'));
  }
};
