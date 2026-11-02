import { DeliveryMarketplacePlugin } from '../types/delivery-marketplace-plugin.model';

export const IFOOD_DELIVERY_PLUGIN: DeliveryMarketplacePlugin = {
  id: 'ifood',
  name: 'iFood',
  iconLabel: 'iF',
  icon: 'delivery_dining',
  colorClass: 'border-rose-800/60 bg-rose-950/30 text-rose-300',
  summary: 'Receber pedidos da loja iFood dentro do Store OS.',
  intakeMethods: ['Webhook', 'Polling com confirmação de eventos'],
  prerequisites: [
    'Cadastrar o aplicativo e solicitar os módulos de pedidos no Portal iFood Developer.',
    'Usar loja e credenciais de teste durante o desenvolvimento.',
    'Concluir homologação e autorização da loja antes de operar em produção.',
    'Guardar client secret e tokens somente no servidor.'
  ],
  documentationUrl: 'https://developer.ifood.com.br/pt-BR/docs/guides'
};
