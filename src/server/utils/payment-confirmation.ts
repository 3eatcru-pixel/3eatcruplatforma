import { OrderTransaction, PaymentTransactionRecord } from '../../shared/models/ecosystem.model';

type ConfirmablePayment = Pick<PaymentTransactionRecord, 'id' | 'tenantId' | 'orderId' | 'amount' | 'status'>;
type ConfirmableOrder = Pick<
  OrderTransaction,
  'tenantId' | 'total' | 'status' | 'paymentStatus' | 'paymentTransactionId'
>;

export interface PaymentConfirmationRejection {
  status: number;
  code: string;
  error: string;
}

export function getPaymentConfirmationRejection(
  payment: ConfirmablePayment,
  order: ConfirmableOrder | undefined
): PaymentConfirmationRejection | undefined {
  if (payment.status !== 'pending_pix') {
    return { status: 409, code: 'PAYMENT_NOT_PENDING', error: 'A transação não está pendente de confirmação.' };
  }
  if (!order) {
    return { status: 404, code: 'ORDER_NOT_FOUND', error: 'O pedido vinculado à transação não foi encontrado.' };
  }
  if (order.tenantId !== payment.tenantId) {
    return { status: 403, code: 'TENANT_MISMATCH', error: 'A transação e o pedido pertencem a estabelecimentos diferentes.' };
  }
  if (order.status === 'cancelled') {
    return { status: 409, code: 'ORDER_CANCELLED', error: 'Não é possível confirmar pagamento de pedido cancelado.' };
  }
  if (order.status === 'completed' || order.paymentStatus === 'approved') {
    return { status: 409, code: 'ORDER_ALREADY_PAID', error: 'O pedido já possui pagamento aprovado.' };
  }
  if (order.paymentStatus === 'refunded') {
    return { status: 409, code: 'ORDER_PAYMENT_REFUNDED', error: 'O pedido possui pagamento estornado e não aceita esta confirmação.' };
  }
  if (order.paymentStatus !== 'pending_pix') {
    return { status: 409, code: 'PAYMENT_NOT_PENDING', error: 'O pedido não está aguardando confirmação de pagamento.' };
  }
  if (order.paymentTransactionId !== payment.id) {
    return { status: 409, code: 'PAYMENT_ATTEMPT_MISMATCH', error: 'O pedido está vinculado a outra tentativa de pagamento.' };
  }
  if (!Number.isFinite(payment.amount) || !Number.isFinite(order.total) || Math.abs(order.total - payment.amount) > 0.05) {
    return { status: 422, code: 'PAYMENT_AMOUNT_MISMATCH', error: 'O valor da transação não corresponde ao total atual do pedido.' };
  }
  return undefined;
}
