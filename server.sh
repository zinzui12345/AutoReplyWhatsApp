#!/bin/bash
while :
do
	systemd-inhibit npm start
	sleep 1
done
