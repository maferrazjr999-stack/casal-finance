# SPEC.md — Splitwise-style logic

## Source
From https://docs.google.com/document/d/1Z3t3eAU5Z5tM5f9Y8s9Z5tM5f9Y8s9Z5tM5f9Y8s (user specification)

## Core Entities

### expense
```js
{
  expense_id: string,        // unique identifier
  description: string,        // required
  total_amount: number,       // > 0
  paid_by: user_id,           // must be in participants
  participants: [user_id],    // non-empty array
  split_type: "equal" | "exact" | "percentage" | "shares",
  split_values: {},           // optional, depends on split_type
  date: date,                 // optional
  group_id: string,          // optional
  status: "pending" | "settled" | "partial"
}
```

### split_types
- **equal**: split_values not needed. `individual = total / count`
- **exact**: `sum(split_values) == total_amount`
- **percentage**: `sum(percentages) == 100`
- **shares**: `sum(shares) > 0`

## Balance Calculation

```js
balance[user] = paid_amount - should_pay_amount
// positive = is owed, negative = owes
```

## Transaction Generation (Debt Settlement)

```js
// Algorithm:
// 1. Separate into creditors (balance > 0) and debtors (balance < 0)
// 2. For each debtor (while balance < 0):
//    - Pick a creditor
//    - amount = min(abs(debtor_balance), creditor_balance)
//    - Create transaction { from, to, amount }
//    - Update both balances
```

## Output Format

```js
balances: { "A": 80, "B": -40, "C": -40 }
transactions: [
  { "from": "B", "to": "A", "amount": 40 },
  { "from": "C", "to": "A", "amount": 40 }
]
```

## Examples

### Example 1: Equal split (3 people, R$120)
- Input: paid_by=A, total=120, participants=[A,B,C], split_type=equal
- Processing: each owes 40. A paid 120.
- Result: A is owed 80, B owes 40, C owes 40
- Settlements: B→A (40), C→A (40)

### Example 2: Custom split
- Input: paid_by=A, total=300, participants=[A,B], split_type=exact, split_values={A:50, B:250}
- Processing: A owes 50, B owes 250. A paid 300.
- Result: A is owed 250, B owes 250
- Settlements: B→A (250)

### Example 3: Percentage
- Input: paid_by=A, total=100, participants=[A,B,C], split_type=percentage, split_values={A:50, B:30, C:20}
- Processing: A owes 50, B owes 30, C owes 20. A paid 100.
- Result: A is owed 50, B owes 30, C owes 20
- Settlements: B→A (30), C→A (20)

## Rules
- Multiple expenses can accumulate per group
- Balances are consolidated per group
- Partial settlement allowed
- Minimize redundant transactions (optimization)

## Status
- pending: not paid
- settled: fully paid
- partial: partially paid