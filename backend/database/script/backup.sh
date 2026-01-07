#!/bin/sh
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M")
docker exec sauer_db \
  mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" \
  > /backups/db_$TIMESTAMP.sql
