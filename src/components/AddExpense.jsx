import { useState } from "react";

export default function AddExpense({ onAdd }) {
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("A");

  function handleSubmit(e) {
    e.preventDefault();

    const value = parseFloat(amount);
    if (!value || value <= 0) return;

    onAdd({
      id: Date.now().toString(),
      amount: value,
      paid_by: paidBy,
      participants: ["A", "B"],
      split_type: "equal",
      split_values: null,
      date: new Date().toISOString()
    });

    setAmount("");
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3>Nova despesa</h3>

      <input
        type="number"
        placeholder="Valor"
        value={amount}
        onChange={e => setAmount(e.target.value)}
      />

      <select value={paidBy} onChange={e => setPaidBy(e.target.value)}>
        <option value="A">Você</option>
        <option value="B">Parceiro</option>
      </select>

      <button type="submit">Adicionar</button>
    </form>
  );
}
