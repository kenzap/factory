# Simplify order mistake correction

There are cases when office teams make mistakes that are only noticable when, for example, material is already written off or the item is issued.

Some mistakes make be easily corrected, example, wrong item name or dimension entered even when it was manufactured according to client's request.

Currently to fix the issue:
- in case metal is written off, it is mandatory to open worklog journal, find relevant record and cancel it. That alone comes with multiple issues. One cancleation may affect multiple orders (in case of batch cutting). It also requires the recreation of the exact cutting actions to bring metal stock into order.
- in case product is issued or manufactured, these actions have to be canceled first.
- all above can be relevant for a single order item.