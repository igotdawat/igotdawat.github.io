export function formatDateLabel(date) {
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
  return `${weekday} · ${date.getDate()} ${month} ${date.getFullYear()}`;
}

export function formatOrderNotification({ type, order, userEmail, userName, items = null, newTotal = null, prevTotal = null }) {
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
    const itemList = (items || order.items || []).map((item, i) => {
      const oldItem = order.items?.[i];
      const change = oldItem && oldItem.qty !== item.qty ? `${oldItem.qty}→${item.qty}` : `${item.qty}`;
      return `~ ${item.name || oldItem?.name} ×${change} — ৳${item.price * item.qty}`;
    }).join('\n');
    const diff = newTotal - (prevTotal || order.total || 0);
    const diffLabel = diff > 0 ? `+৳${diff}` : `৳${diff}`;
    message = `Order edited — ${dateLabel}\nBy: ${byLabel}\n${itemList}\nTotal: ৳${newTotal} (${diffLabel})`;
  }

  return message;
}
