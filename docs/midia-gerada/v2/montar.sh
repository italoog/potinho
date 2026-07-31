#!/usr/bin/env bash
# Monta os 4 anuncios 9:16 a partir dos segmentos em v2/seg/.
# Rodar de dentro de docs/midia-gerada/.  Requer ffmpeg no PATH.
set -e

# recorta as cartelas finais (slogan "carinho em cada potinho" incluso)
for d in site perfil; do
  ffmpeg -v error -y -i v2/CARD-$d.mp4 -t 2.9 -vf "fps=30,scale=1080:1920,setsar=1" -an \
    -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p v2/seg/card-$d.mp4
done

MONTA(){ P=$1; D=$2; DUR=$3; LI=$4; LF=$5; shift 5
  L=v2/seg/list-$P-$D.txt; : > $L
  for s in "$@"; do echo "file '$s.mp4'" >> $L; done
  echo "file 'card-$D.mp4'" >> $L
  FO=$(awk -v d=$DUR 'BEGIN{printf "%.2f", d-1.6}')
  ffmpeg -v error -y -f concat -safe 0 -i $L -c copy v2/seg/tmp-$P-$D.mp4
  ffmpeg -v error -y -i v2/seg/tmp-$P-$D.mp4 $VOZIN -i trilha-guitarra.mp3 -i logo.png \
    -filter_complex "$VOZF[${NT}:a]atrim=0:$DUR,asetpts=PTS-STARTPTS,volume=0.13,afade=t=in:st=0:d=1.2,afade=t=out:st=$FO:d=1.6[mus];${VOZL}[mus]amix=inputs=$((NV+1)):duration=longest:normalize=0,alimiter=limit=0.95[a];[$((NT+1)):v]scale=88:-1,format=rgba,colorchannelmixer=aa=0.8[lg];[0:v][lg]overlay=68:1450:enable='between(t,$LI,$LF)'[v]" \
    -map "[v]" -map "[a]" -t $DUR -c:v libx264 -crf 19 -preset medium -pix_fmt yuv420p \
    -c:a aac -b:a 192k -movflags +faststart "v2/AD-$P-9x16-$D.mp4"
  printf "%-30s " "AD-$P-9x16-$D.mp4"; ffprobe -v error -show_entries format=duration -of csv=p=0 "v2/AD-$P-9x16-$D.mp4"; }

# ---- B3 "A assinatura" (14,7s) ----
NV=4; NT=5
VOZIN="-i v2/voz/b3-1.mp3 -i v2/voz/b3-2.mp3 -i v2/voz/b3-3a.mp3 -i v2/voz/b3-3b.mp3"
VOZF="[1:a]adelay=250|250[q1];[2:a]adelay=3050|3050[q2];[3:a]adelay=6150|6150[q3];[4:a]adelay=8250|8250[q4];"
VOZL="[q1][q2][q3][q4]"
for d in site perfil; do MONTA b3 $d 14.7 2.8 11.8 b3-s1 b3-s2 b3-s3 b3-s4; done

# ---- B1 "Dez mil iguais" (16,9s) ----
NV=3; NT=4
VOZIN="-i v2/voz/b1-1.mp3 -i v2/voz/b1-2.mp3 -i v2/voz/b1-3.mp3"
VOZF="[1:a]adelay=300|300[q1];[2:a]adelay=6000|6000[q2];[3:a]adelay=9600|9600[q3];"
VOZL="[q1][q2][q3]"
for d in site perfil; do MONTA b1 $d 16.9 5.6 14.0 b1-s1 b1-s2 b1-s3 b1-s4; done

# ---- R2 "O que e so dele" (17,9s) ----
NV=4; NT=5
VOZIN="-i v2/voz/r2-1.mp3 -i v2/voz/r2-2.mp3 -i v2/voz/r2-3.mp3 -i v2/voz/r2-4.mp3"
VOZF="[1:a]adelay=300|300[q1];[2:a]adelay=3300|3300[q2];[3:a]adelay=7000|7000[q3];[4:a]adelay=10200|10200[q4];"
VOZL="[q1][q2][q3][q4]"
for d in site perfil; do MONTA r2 $d 17.9 3.0 15.0 r2-s1 r2-s2 r2-s3 r2-s4; done

# ---- R1 "O inventario dele" (13,0s) ----
NV=3; NT=4
VOZIN="-i v2/voz/r1-1.mp3 -i v2/voz/r1-2.mp3 -i v2/voz/r1-3.mp3"
VOZF="[1:a]adelay=300|300[q1];[2:a]adelay=3900|3900[q2];[3:a]adelay=7400|7400[q3];"
VOZL="[q1][q2][q3]"
for d in site perfil; do MONTA r1 $d 13.0 3.6 10.1 r1-s1 r1-s2 r1-s3; done

# ---- B2 "O xara" (13,07s) — Leva 3 ----
NV=3; NT=4
VOZIN="-i v2/voz/b2-1.mp3 -i v2/voz/b2-2.mp3 -i v2/voz/b2-3.mp3"
VOZF="[1:a]adelay=200|200[q1];[2:a]adelay=3900|3900[q2];[3:a]adelay=5870|5870[q3];"
VOZL="[q1][q2][q3]"
for d in site perfil; do MONTA b2 $d 13.07 3.9 10.17 b2-s1 b2-s2 b2-s3 b2-s4; done
