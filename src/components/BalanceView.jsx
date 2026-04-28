export default function BalanceView({ balances }) {
  const myBalance = balances["A"] || 0;

  return (
    <div>
      <h2>Resumo</h2>

      {myBalance > 0 && (
        <p style={{ color: "green" }}>
          Você tem a receber R$ {myBalance.toFixed(2)}
        </p>
      )}

      {myBalance < 0 && (
        <p style={{ color: "red" }}>
          Você deve R$ {Math.abs(myBalance).toFixed(2)}
        </p>
      )}

      {myBalance === 0 && <p>Tudo acertado 👍</p>}
    </div>
  );
}
