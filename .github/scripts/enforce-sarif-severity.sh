#!/usr/bin/env bash
set -euo pipefail

SARIF_FILE="${1:?Usage: enforce-sarif-severity.sh <sarif-file> [threshold]}"
THRESHOLD="${2:-7.0}"

if [[ ! -s "$SARIF_FILE" ]]; then
  echo "No SARIF file or empty: $SARIF_FILE — skipping severity gate."
  exit 0
fi

VIOLATIONS="$(
  jq -r --arg threshold "$THRESHOLD" '
    def rule_severity($rules; $rule_id):
      ($rules[] | select(.id == $rule_id) | .properties."security-severity" // "0") // "0"
      | tonumber;

    def result_severity($run; $result):
      ($result.properties."security-severity" // null) as $prop |
      if $prop != null then ($prop | tonumber)
      else rule_severity($run.tool.driver.rules // []; $result.ruleId // "")
      end;

    [.runs[]? as $run |
      $run.results[]? |
      select(result_severity($run; .) >= ($threshold | tonumber)) |
      "\(.ruleId // "unknown") | severity=\(result_severity($run; .)) | \(.message.text // "no message")"
    ] | .[]
  ' "$SARIF_FILE" 2>/dev/null || true
)"

if [[ -z "$VIOLATIONS" ]]; then
  echo "No HIGH or CRITICAL findings (security-severity >= ${THRESHOLD}) in ${SARIF_FILE}."
  exit 0
fi

echo "::error::Found HIGH/CRITICAL findings (security-severity >= ${THRESHOLD}) in ${SARIF_FILE}:"
while IFS= read -r line; do
  [[ -n "$line" ]] && echo "  - $line"
done <<< "$VIOLATIONS"
exit 1
