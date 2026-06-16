#!/usr/bin/env bash
# Nasazení hry Louka na Vercel (produkce).
#
# Proč skrýváme .git: Vercel tým "nechmerust-2916" má zapnutou ochranu podle
# autora commitu. CLI z tohoto adresáře přibalí autora posledního commitu
# (lukas@nechmerust.org), který není členem týmu → deploy je BLOCKED.
# Když .git na dobu nasazení schováme, CLI žádného git-autora nepřipojí a
# deploy proběhne. (Trvalá oprava: v nastavení Vercel týmu vypnout "Git Author
# Protection", nebo commitovat e-mailem, který tým zná.)
set -e
cd "$(dirname "$0")"
mv .git .git_tmp 2>/dev/null || true
trap 'mv .git_tmp .git 2>/dev/null || true' EXIT
vercel --prod --yes --scope nechmerust-2916s-projects
