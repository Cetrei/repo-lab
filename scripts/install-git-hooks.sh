#!/bin/sh
set -e
root=$(git rev-parse --show-toplevel)
common=$(git rev-parse --path-format=absolute --git-common-dir)
main=$(dirname "$common")
hook="$common/hooks/commit-msg"
mkdir -p "$common/hooks"
cat > "$hook" <<'HOOK'
#!/bin/sh
common=$(git rev-parse --path-format=absolute --git-common-dir)
main=$(dirname "$common")
config="$main/commitlint.config.mjs"
if [ ! -f "$config" ]; then
  config="$(git rev-parse --show-toplevel)/commitlint.config.mjs"
fi
exec bunx --bun @commitlint/cli@19 --config "$config" --edit "$1"
HOOK
chmod +x "$hook"
echo "commit-msg hook installed in $common/hooks"
