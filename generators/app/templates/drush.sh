#!/bin/bash
#
# drush.sh - wrapper for drush command running on php docker container
#

docker-compose exec --user=82 php-<%= instance %> drush -r /var/www/html/web $@
