import { DeliveryMarketplacePlugin } from '../types/delivery-marketplace-plugin.model';

export const NINETY_NINE_FOOD_PLUGIN: DeliveryMarketplacePlugin = {
  id: '99food',
  name: '99Food',
  iconLabel: '99',
  icon: 'delivery_dining',
  colorClass: 'border-yellow-800/60 bg-yellow-950/30 text-yellow-300',
  summary: 'Receber pedidos da 99Food e encaminhá-los ao fluxo da loja.',
  intakeMethods: ['Eventos de pedidos', 'Webhook ou polling, conforme o acesso liberado'],
  prerequisites: [
    'Cadastrar e certificar o aplicativo no Portal de Desenvolvedores 99Food.',
    'Validar o fluxo no ambiente de teste e obter autorização da loja.',
    'Confirmar com a 99Food o escopo de pedidos e as condições para integrador terceiro.',
    'Guardar credenciais e tokens somente no servidor.'
  ],
  documentationUrl: 'https://developer-food.99app.com/pt-BR/home'
};
