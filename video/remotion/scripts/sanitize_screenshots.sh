#!/bin/bash
# Copies the team's USC screenshots into public/usc_screenshots/ with personal data blurred (names, USC ID, avatars).
# Usage: bash scripts/sanitize_screenshots.sh <folder with the original screenshots>
# Regions are x,y,w,h in original pixels; re-check them visually whenever the screenshots are replaced.
set -e
SRC=$1
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/usc_screenshots"
mkdir -p "$OUT"

blur() {
  local in out f i r
  in=$(ls "$SRC"/Screenshot*"$1"*.png); out="$OUT/$2"; shift 2
  f="[0]null[b0]"; i=0
  for r in "$@"; do
    IFS=, read -r x y w h <<< "$r"
    f="$f;[0]crop=$w:$h:$x:$y,boxblur=20:4[c$i];[b$i][c$i]overlay=$x:$y[b$((i+1))]"
    i=$((i+1))
  done
  ffmpeg -y -loglevel error -i "$in" -filter_complex "$f" -map "[b$i]" "$out"
}

blur 10.04.06 experience_home.png "190,940,880,600" "2640,0,284,230"
blur 10.04.13 usc_resource_directory.png
blur 10.04.56 finances_billing.png "2640,0,290,140"
blur 10.05.05 events.png "2600,0,294,140"
blur 10.05.16 organizations.png "2630,0,296,140"
blur 10.05.29 offsite_opportunities.png "2640,0,300,140"
blur 10.08.33 student_health.png "2300,120,634,180" "500,290,400,160" "2640,0,294,110"
blur 10.09.30 web_registration.png "2050,270,860,140" "2640,0,300,140"
blur 10.09.41 libraries.png "2640,0,290,140"
ls "$OUT"
