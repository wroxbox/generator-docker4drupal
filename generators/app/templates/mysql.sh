#!/bin/bash
#
# mysql.sh - helper script for running mysql operations
#
# Author: Paulo Gomes <www.pauloamgomes.net>
#
# Changelog:
#
#       22.10.2017 - initial release

usage() {
  cat <<-EOF

    USAGE: ./mysql.sh [OPTIONS]

    OPTIONS

      backup    Creates a backup of current drupal database
      restore   Restores a previous backup
      cli       Opens an mysql shell

EOF
}

restore() {
    DUMP="$1"
    if [ ! -f $DUMP ]; then
        echo "Cannot find or load sql file at $DUMP"
        exit 1
    fi

    echo "Restoring mysql dump $DUMP. Please wait, it can take some minutes..."
    INSTANCE=`docker ps | grep php-<%= instance %> | awk  '{print $1}'`
    if [ x"$INSTANCE" = x"" ]; then
        echo "Error! Cannot find php-<%= instance %> docker instance."
        exit 1
    fi
    docker exec -i $INSTANCE mysql -A -u drupal -pdrupal -h mariadb-<%= instance %> drupal < $DUMP
    echo "Done!"
}

backup() {
    FILENAME="<%= instance %>-db-$(date +"%m_%d_%Y_%H_%m").sql"

    echo "Creating mysql dump $FILENAME ..."
    docker-compose exec --user=82 php-<%= instance %> drush -r /var/www/html/web sql-dump > ../$FILENAME
    cd ..
    echo "Done! `du -sh $FILENAME`"
}

cli() {
    docker-compose exec --user=82 php-<%= instance %> drush -r /var/www/html/web sql-cli
}

COMMAND=`echo $1 | sed 's/^[^=]*=//g'`

case "$COMMAND" in
    restore)
        DUMP=`echo $2 | sed 's/^[^=]*=//g'`
        restore $DUMP
        ;;
    backup)
        backup
        ;;
    cli)
        cli
        ;;
    *)
        echo "ERROR: unknown command \"$COMMAND\""
        usage
        exit 1
        ;;
esac
