#!/bin/bash
cd /home/kavia/workspace/code-generation/daily-notes-organizer-13518/task_backend
npm run lint
LINT_EXIT_CODE=$?
if [ $LINT_EXIT_CODE -ne 0 ]; then
  exit 1
fi

