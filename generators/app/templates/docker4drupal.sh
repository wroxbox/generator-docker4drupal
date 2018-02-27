#!/bin/bash
#
# docker4drupal.sh - helper script for handling docker-sync and docker-compose
#                    start/stop commands.
#                    It also provides a shell option for the php container.
#
# Author: Paulo Gomes <www.pauloamgomes.net>
#
# Changelog:
#
#       20.08.2017 - initial release
#

DRUPAL_MODE="<%= genType %>"
DRUPAL_VERSION="<%= version %>"

usage() {
  cat <<-EOF

    USAGE: ./docker4drupal.sh [OPTIONS]

    OPTIONS

      start       Starts docker-sync and docker-compose containers.
      stop        Stops docker-sync and docker-compose containers.
      shell       Opens a bash shell in the docker php container.
                  Use ./docker4drupal.sh shell root to run as root.
      status      Display status of running containers.
      hosts       Add container endpoints to /etc/hosts file (requires sudo).
                  Use sudo ./docker4drupal.sh hosts
      recreate    Recreates all containers (ALL DATA WILL BE ERASED)
      drush       Run drush command inside php container
      reinstall   Forces installation of drupal
      db-backup   Creates a database dump
      db-restore  Restores a database dump
      db-cli      Opens the mysql cli
      help        Display list of useful docker commands.

EOF
}

showHelp() {
  usage
  commands
  exit 0
}

commands() {
  cat <<-EOF

    To check docker-sync logs execute:
      tail -f docker/.docker-sync/daemon.log

    To check docker-compose logs execute:
      $ cd docker; docker-compose logs -f

EOF
}

exitError() {
  echo
  echo "Fatal Error: $@"
  echo
  exit 1
}

start() {
  echo "Starting docker-sync..."
  docker-sync start || exitError "Error initializing docker-sync"
  echo "Done!"
  echo
  echo "Starting docker-compose..."
  docker-compose up -d || exitError "Error initializing docker-compose"
  echo "Done!"
  echo
  # On first run give some time for full docker sync ends.
  if [ ! -d "../docroot/web/modules" ]; then
    echo "First execution. Docker Sync is doing a full sync, it can take 1 minute or more, please wait..."
    if [ $DRUPAL_VERSION == "D8" ]; then
      sleep 90
    else
      sleep 30
    fi
    if [ $DRUPAL_MODE == "vanilla" ]; then
      echo "Installing Drupal..."
      install
      echo
      echo "Drupal installed"
      echo
      echo " username: admin"
      echo " password: admin"
    fi
  fi
  echo
  status
  echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
  echo
  commands
  echo
}

install() {
  docker-compose exec --user=82 php-<%= instance %> drush -r /var/www/html/web si standard --db-url=mysql://drupal:drupal@mariadb-<%= instance %>/drupal --account-name=admin --account-pass=admin -y
}

stop() {
  echo "Stopping docker-compose..."
  docker-compose stop || exitError "error stopping docker-compose"
  echo "Done!"
  echo "Stopping docker-sync..."
  docker-sync stop || exitError "error stopping docker-sync"
  echo "Done!"
  echo
}

shell() {
  echo
  echo "Opening bash shell for container php-<%= instance %>"
  echo
  if [ x"$1" == x"root" ]; then
    docker-compose exec --user=root php-<%= instance %> bash
  else
    docker-compose exec --user=82 php-<%= instance %> bash
  fi
}

hosts() {
  echo
  echo "Updating /etc/hosts file with docker entries"
  echo
  echo "# drupal4docker - <%= siteName %> "
  echo "Adding <%= domain %> -> 127.0.0.1" >> /etc/hosts
  echo -e "127.0.0.1\t<%= domain %>" >> /etc/hosts
  echo "Adding mailhog.<%= domain %> -> 127.0.0.1"
  echo -e "127.0.0.1\tmailhog.<%= domain %>" >> /etc/hosts
  echo "Adding pma.<%= domain %> -> 127.0.0.1"
  echo -e "127.0.0.1\tpma.<%= domain %>" >> /etc/hosts
  echo "# END OF drupal4docker entries" >> /etc/hosts
  echo
}

status() {
  echo
  echo " Available endpoints:"
  echo
  echo " Drupal      http://<%= domain %>"
  echo " Mailhog     http://mailhog.<%= domain %>"
  echo " PhpMyAdmin  http://pma.<%= domain %>"
  echo
  echo " Status of running containers for <%= siteName %>"
  echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
  echo
  docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Size}}\t{{.Status}}" | grep "<%= instance %>" | grep -v CONTAINER
  echo
  echo
}

recreate() {
  echo "Removing containers"
  docker-compose down
  echo "Cleaning docker syncs"
  docker-sync clean
}

COMMAND=`echo $1 | sed 's/^[^=]*=//g'`

echo
echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
echo " docker4drupal.sh command helper for <%= siteName %>"
echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
echo

if [ ! -f "docker/docker-compose.yml" ]; then
  exitError "missing docker compose file - docker/docker-compose.yml"
fi

if [ ! -f "docker/docker-sync.yml" ]; then
  exitError "missing docker sync file - docker/docker-sync.yml"
fi

if [ $DRUPAL_MODE == "custom" ]; then
  if [[ (! -d "docroot/web/core") || (! -f "docroot/web/index.php") ]]; then
    exitError "cannot find a valid drupal codebase at ./docroot/web"
  fi
fi

shift
cd docker

case "$COMMAND" in
 start)
  start
  ;;
 stop)
  stop
  ;;
 shell)
  shell $@
  ;;
 status)
  status
  ;;
 hosts)
  hosts
  ;;
 recreate)
  recreate
  ;;
 drush)
  ./drush.sh $@
  ;;
 reinstall)
  install
  ;;
 db-backup)
  ./mysql.sh backup
  ;;
 db-restore)
  ./mysql.sh restore $@
  ;;
 db-cli)
  ./mysql.sh cli
  ;;
 help)
  showHelp
  ;;
 *)
  echo "ERROR: unknown command \"$COMMAND\""
  usage
  exit 1
  ;;
esac

exit 0

