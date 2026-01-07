#!/bin/sh
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M")
mysqldump -h db -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" > /backups/db_$TIMESTAMP.sql

echo "Záloha hotova: db_$TIMESTAMP.sql"