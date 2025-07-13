# Copilot Instructions

## Ticket Completion Commit Policy

When working on a GitHub ticket (issue or pull request) with a ticket number,
and you believe you have finished the task, you must always propose to commit
the relevant changes with a clear, descriptive commit message that includes:
"Closes #{ticketNumber}" (where ticketNumber is the number of the ticket).
This ensures the ticket is automatically closed when the commit is pushed.

In short, execute the following steps:

1. Make your changes in the codebase.
2. Stage your changes for commit: `git add {your changed files}`.
3. Write a commit message that describes the changes and includes "Closes #{ticketNumber}"
   (e.g., "Closes #42" if the ticket number is 42).
4. Commit your changes: `git commit -m "Your commit message here"`.

You can do this for me by proposing terminal commands to me.

### Example

If you finish work for ticket #42, your commit message should include: "Closes #42"
