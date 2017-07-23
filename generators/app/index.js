'use strict';
const Generator = require('yeoman-generator');
const chalk = require('chalk');
const yosay = require('yosay');
var _ = require('lodash');
var mkdirp = require('mkdirp');

const phpImages = {
  vanilla: [
    {value: 'wodby/drupal:8-7.1-2.4.3', name: 'Drupal 8 - PHP 7.1'},
    {value: 'wodby/drupal:8-7.0-2.4.3', name: 'Drupal 8 - PHP 7.0'},
    {value: 'wodby/drupal:7-7.1-2.4.3', name: 'Drupal 7 - PHP 7.1'},
    {value: 'wodby/drupal:7-7.0-2.4.3', name: 'Drupal 7 - PHP 7.0'},
    {value: 'wodby/drupal:7-5.6-2.4.3', name: 'Drupal 7 - PHP 5.6'},
    {value: 'wodby/drupal:6-5.6-2.4.3', name: 'Drupal 6 - PHP 5.6'},
    {value: 'wodby/drupal:6-5.3-2.4.3', name: 'Drupal 6 - PHP 5.3'}
  ],
  custom: [
    {value: 'wodby/drupal-php:7.1-2.4.2', name: 'PHP 7.1'},
    {value: 'wodby/drupal-php:7.0-2.4.2', name: 'PHP 7.0'},
    {value: 'wodby/drupal-php:5.6-2.4.2', name: 'PHP 5.6'},
    {value: 'wodby/drupal-php:5.3-2.4.2', name: 'PHP 5.3'}
  ]
};

const nginxImages = {
  D8: 'wodby/drupal-nginx:8-1.13-2.4.0',
  D7: 'wodby/drupal-nginx:7-1.13-2.4.0',
  D6: 'wodby/drupal-nginx:6-1.13-2.4.0'
};

module.exports = class extends Generator {
  prompting() {
    // Have Yeoman greet the user.
    this.log(yosay(
      'Welcome to the epic ' + chalk.red('generator-docker4drupal') + ' generator!'
    ));

    const prompts = [{
      type: 'list',
      name: 'genType',
      message: 'What kind of drupal docker you want?',
      choices: [
        {
          value: 'vanilla',
          name: 'Use "vanilla" Drupal from docker4drupal'
        },
        {
          value: 'custom',
          name: 'Use a "custom" Drupal docroot'
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
      message: 'What is your drupal site domain? Ex: d8.docker.localhost',
      default: 'drupal.docker.localhost'
    }];

    return this.prompt(prompts).then(props => {
      this.props = props;
    });
  }

  writing() {
    const drupalVersion = 'D' + this.props.phpImage.match(/^wodby\/drupal:([6-8])-/)[1];
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
    this.fs.copy(
      this.templatePath('ddocker.sh'),
      this.destinationPath('docker/ddocker.sh')
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
    this.spawnCommand('openssl', ['req', '-x509', '-nodes', '-days', '365', '-newkey', 'rsa:2048', '-subj', '/C=UK/ST=Drupal/L=Mars/O=Dis/CN=drupal.docker.localhost', '-keyout', 'certs/key.pem', '-out', 'certs/cert.pem']);
    this.log('Docker and Drupal related files generated.')
  }
};
