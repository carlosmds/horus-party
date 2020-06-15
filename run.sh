#!/usr/bin/env bash
set -e

ver="1.0.11"

project=$(printf '%s\n' "${PWD#*-}")
runnable=$1
[ -z "$2" ] && environment=$runnable || environment=$2

red="\e[1m\e[31m###\e[0m"
green="\e[1m\e[32m###\e[0m"
blue="\e[1m\e[34m###\e[0m"
cyan="\e[1m\e[36m###\e[0m"

image="node:10"

redis_cmd="docker run -d --rm --name $project-redis-$runnable -p 6379:6379 redis "
docker_cmd="docker run -d --rm --name $project-$runnable -v "$PWD":/usr/src/app -w /usr/src/app"

v(){
   echo -e "$green v$ver"
}

version(){
    v
}

dev(){
    redis
    run="$docker_cmd --link $project-redis-$environment -p 3000:3000 $image node server.js"
    runit
}

prod(){
    run="docker-compose up -d"
    runit
}

k(){
    run="docker kill $(docker ps | grep $project | awk '{ print $1 }')"
    runit || true
}

redis(){
    run="$redis_cmd"
    runit
}

log(){
    echo -e "\n$cyan $1"
}

runit(){
    log "$run"
    $run
}

help(){
    echo -e "Aqui vai ter a ajuda quando ela ficar pronta"
}

[ -z $1 ] && help && exit 0

echo -e "\n$blue Running \e[1m$1 \e[0mcommand..."

$1

if [ $? -eq 0 ]; then
    echo -e "\n$green Finished!\n"
else
    echo -e "\n$red Houston, we have a problem!\n"
fi
