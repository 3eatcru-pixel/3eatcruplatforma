import { DeliveryMarketplacePlugin } from '../types/delivery-marketplace-plugin.model';

export const RAPPI_DELIVERY_PLUGIN: DeliveryMarketplacePlugin = {
  id: 'rappi',
  name: 'Rappi',
  iconLabel: 'R',
  icon: 'delivery_dining',
  colorClass: 'border-orange-800/60 bg-orange-950/30 text-orange-300',
  summary: 'Receber os pedidos Rappi no ponto de venda da loja.',
  intakeMethods: ['Integração de pedidos via POS/API autorizada'],
  prerequisites: [
    'Solicitar habilitação da integração com a Rappi ou pelo gerente de conta.',
    'Obter acesso ao portal técnico e às credenciais do ambiente aprovado.',
    'Testar recebimento de pedidos e sincronização de estados antes da produção.',
    'Guardar credenciais e tokens somente no servidor.'
  ],
  documentationUrl: 'https://merchants.rappi.com/pt-br/o-que-ofrecemos/sistema-pos'
};
