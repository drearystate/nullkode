#!/bin/bash
cd -- "$(dirname -- "$0")"
bash ./install.sh
printf '\nPress Enter to close.'
read -r _
