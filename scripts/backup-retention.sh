#!/usr/bin/env bash
# Sourced by backup.sh. Only completed sets created by this version are eligible.

cool_backup_validate_root() {
  local root=$1 component current=/
  local -a components
  [[ -n "$root" && "$root" != *$'\n'* ]] || {
    echo 'Invalid backup root' >&2; return 1;
  }
  [[ "$root" == /* ]] || root="$PWD/$root"
  IFS=/ read -r -a components <<< "$root"
  for component in "${components[@]}"; do
    [[ -n "$component" && "$component" != . ]] || continue
    [[ "$component" != .. ]] || {
      echo 'Backup root must not contain parent traversal' >&2; return 1;
    }
    current="${current%/}/$component"
    if [[ -L "$current" || ( -e "$current" && ! -d "$current" ) ]]; then
      echo "Backup root must use real directories only: $current" >&2; return 1
    fi
  done
  [[ "$current" != / ]] || { echo 'Backup root must not be /' >&2; return 1; }
}

cool_backup_is_complete() (
  local directory=$1 entry
  [[ "$directory" =~ ^cool-[0-9]{8}T[0-9]{6}\.[0-9]{9}Z-[A-Za-z0-9]{12}$ ]] || return 1
  [[ ! -L "$directory" && -d "$directory" ]] || return 1
  # An unreadable directory must never look like an empty, safe-to-delete set.
  [[ -r "$directory" && -x "$directory" ]] || return 1
  for entry in database.dump media.tar.gz .cool-backup-complete; do
    [[ ! -L "$directory/$entry" && -f "$directory/$entry" && -s "$directory/$entry" ]] || return 1
  done
  [[ "$(< "$directory/.cool-backup-complete")" == cool-backup-v1 ]] || return 1
  shopt -s nullglob dotglob
  for entry in "$directory"/*; do
    [[ ! -L "$entry" && -f "$entry" ]] || return 1
    case "${entry##*/}" in
      database.dump|media.tar.gz|.cool-backup-complete|release.yml) ;;
      *) return 1 ;;
    esac
  done
)

cool_backup_prune() (
  local root=$1 directory index
  local -a completed=() newest=()
  cool_backup_validate_root "$root" || return
  # Work from the real root directory; never traverse candidate symlinks.
  cd -P -- "$root" || return
  shopt -s nullglob
  for directory in cool-*; do
    if cool_backup_is_complete "$directory"; then completed+=("$directory"); fi
  done
  [[ ${#completed[@]} -gt 10 ]] || return 0
  mapfile -t newest < <(printf '%s\n' "${completed[@]}" | LC_ALL=C sort -r)
  for ((index=10; index<${#newest[@]}; index++)); do
    directory=${newest[$index]}
    # Recheck immediately before removal; any partial/modified set is preserved.
    cool_backup_is_complete "$directory" || continue
    # Never recursively delete: unexpected files/subdirectories remain untouched.
    rm -- "$directory/database.dump" "$directory/media.tar.gz" "$directory/.cool-backup-complete" || return
    if [[ ! -L "$directory/release.yml" && -f "$directory/release.yml" ]]; then
      rm -- "$directory/release.yml" || return
    fi
    rmdir -- "$directory" || return
  done
)
