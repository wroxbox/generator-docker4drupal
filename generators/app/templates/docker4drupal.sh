#!/bin/bash
#
# Docker4Drupal.sh - helper script for handling docker-sync and docker-compose
#                    start/stop commands.
#                    It also provides a shell option for the php container.
#
# Author: Paulo Gomes <www.pauloamgomes.net>
#
# Changelog:
#
#       20.08.2017 - initial release
#

DRUPAL_MODE=<%= genType %>

usage() {
  cat <<-EOF

    USAGE: ../docker4drupal.sh [OPTIONS]

    OPTIONS

      start     Starts docker-sync and docker-compose containers.
      stop      Stops docker-sync and docker-compose containers.
      shell     Opens a bash shell in the docker php container.
      status    Display status of running containers.
      hosts     Add container endpoints to /etc/hosts file (requires sudo).
                Use sudo ./docker4drupal.sh hosts
      recreate  Recreates all containers (ALL DATA WILL BE ERASED)
      help      Display list of useful docker commands.

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
  echo "Starting docker-compose..."
  docker-compose up -d || exitError "Error initializing docker-compose"
  echo "Done!"
  echo
  status
  echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
  echo
  commands
  echo
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
  docker-compose exec --user=82 php-<%= instance %> bash
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
    exitError "cannot find a valid drupal codebase at ./docroot or ./docroot/web"
  fi
fi

case "$COMMAND" in
 start)
  cd docker
  start
  ;;
 stop)
  cd docker
  stop
  ;;
 shell)
  cd docker
  shell
  ;;
 status)
  cd docker
  status
  ;;
 hosts)
  hosts
  exit 0
  ;;
 recreate)
  cd docker
  recreate
  exit 0
  ;;
 help)
  showHelp
  exit 0
  ;;
 *)
  echo "ERROR: unknown command \"$COMMAND\""
  usage
  exit 1
  ;;
esac

