export function formatDateLabel(date) {
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
  return `${weekday} · ${date.getDate()} ${month} ${date.getFullYear()}`;
}

export function formatOrderNotification({ type, order, userEmail, userName, items = null, newTotal = null, prevTotal = null, oldItems = null }) {
  const date = new Date(order.forDate);
  const dateLabel = formatDateLabel(date);
  const byLabel = userName ? `${userName} (${userEmail})` : userEmail;

  let message = '';

  if (type === 'order-placed') {
    const itemList = (order.items || []).map((it) => `• ${it.name} ×${it.qty} — ৳${it.price * it.qty}`).join('\n');
    message = `New order — ${dateLabel}\nBy: ${byLabel}\n${itemList}\nTotal: ৳${order.total}`;
  }
  else if (type === 'order-cancelled') {
    const itemList = (order.items || []).map((it) => `• ${it.name} ×${it.qty} — ৳${it.price * it.qty}`).join('\n');
    message = `Order cancelled — ${dateLabel}\nBy: ${byLabel}\n${itemList}\nRefund: ৳${order.total || 0}`;
  }
  else if (type === 'order-edited') {
    const lines = [];
    const newItems = items || order.items || [];
    const prevItems = oldItems || order.items || [];
    const newQtyById = {};
    const prevQtyById = {};
    const priceById = {};
    const nameById = {};

    newItems.forEach(it => {
      newQtyById[it.mealId] = it.qty;
      priceById[it.mealId] = it.price;
      nameById[it.mealId] = it.name;
    });

    prevItems.forEach(it => {
      prevQtyById[it.mealId] = it.qty;
      priceById[it.mealId] = it.price;
      nameById[it.mealId] = it.name;
    });

    newItems.forEach(it => {
      const prevQty = prevQtyById[it.mealId] || 0;
      if (prevQty > 0 && prevQty !== it.qty) {
        lines.push(`~ ${it.name} ×${prevQty}→${it.qty} — ৳${it.price * it.qty}`);
      } else if (prevQty > 0) {
        lines.push(`• ${it.name} ×${it.qty} — ৳${it.price * it.qty}`);
      } else {
        lines.push(`+ ${it.name} ×${it.qty} — ৳${it.price * it.qty} (new)`);
      }
    });

    Object.keys(prevQtyById).forEach((id) => {
      if (!(id in newQtyById) || newQtyById[id] === 0) {
        const before = prevQtyById[id];
        if (before > 0) {
          lines.push(`− ${nameById[id] || id} ×${before} — ৳${before * (priceById[id] || 0)} (removed)`);
        }
      }
    });

    const itemList = lines.join('\n');
    const diff = newTotal - (prevTotal || order.total || 0);
    const diffLabel = diff > 0 ? `+৳${diff}` : `৳${diff}`;
    message = `Order edited — ${dateLabel}\nBy: ${byLabel}\n${itemList}\nTotal: ৳${newTotal} (${diffLabel})`;
  }

  return message;
}
