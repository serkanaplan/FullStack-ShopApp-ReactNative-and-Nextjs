'use server';

import { createClient } from '@/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendNotification } from './notifications';

export const getOrdersWithProducts = async () => {
  const supabase =await createClient();
  const { data, error } = await supabase
    .from('order')
    .select('*, order_items:order_item(*, product(*)), user(*)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return data;
};

export const updateOrderStatus = async (orderId: number, status: string) => {
  const supabase =await createClient();
  const { error } = await supabase
    .from('order')
    .update({ status })
    .eq('id', orderId);

  if (error) throw new Error(error.message);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user.id!;

  await sendNotification(userId, status + ' 🚀');

  revalidatePath('/admin/orders');
};

export const getMonthlyOrders = async () => {
  const supabase = createClient();
  const { data, error } = await supabase.from('order').select('created_at');

  if (error) throw new Error(error.message);

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Sunucu tarafında hesaplamayı sabitle
  const ordersByMonth = data.reduce((acc: Record<string, number>, order: { created_at: string })=> {
    // UTC kullanarak tutarlılığı sağla
    const date = new Date(order.created_at);
    const month = monthNames[date.getUTCMonth()];

    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  return Object.keys(ordersByMonth).map(month => ({
    name: month,
    orders: ordersByMonth[month],
  }));
};