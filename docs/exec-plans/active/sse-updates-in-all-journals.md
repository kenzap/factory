# Server side updates

This feature brings all manufacturing and production operations into live. However, some journals currently missing this functionality. For example,

- cutting journal reflects bubble indication of number of items pending for cuttings. These indicators should be updated in live whenever new items are added or removed from cutting queue.
- cutting-list journal need to sync cutting status, manufacturing readiness and coil updates (coil length is increased or decreased, new coils added in the metallog) in live.
- order editing page, should immediately block or unblock item editing whenever their inventory records are changes, ex. issued, written off etc.
- similar should happen in orders, payments, worklog journals