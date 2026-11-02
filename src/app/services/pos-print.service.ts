import { Injectable } from '@angular/core';
import { OrderTransaction } from '../models/ecosystem.model';
import { ReceiptPaperWidthMm } from './os-preferences.service';

@Injectable({ providedIn: 'root' })
export class PosPrintService {
  printReceipt(
    order: OrderTransaction,
    paperWidthMm: ReceiptPaperWidthMm,
    printerLabel = ''
  ): boolean {
    const items = order.items.map((item) => `
      <div class="row item">
        <span>${this.escapeHtml(item.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 3 }))} × ${this.escapeHtml(item.product.name)}</span>
        <strong>${this.formatCurrency(item.quantity * item.product.price)}</strong>
      </div>
      ${item.notes ? `<p class="note">${this.escapeHtml(item.notes)}</p>` : ''}
    `).join('');
    const terminalLabel = order.externalTerminalMethod
      ? `Terminal externo • ${this.paymentMethodLabel(order.externalTerminalMethod)}`
      : this.paymentMethodLabel(order.paymentMethod);
    const manualNotice = order.externalTerminalMethod
      ? '<p class="notice">Recebimento confirmado manualmente pelo operador. O equipamento não foi consultado.</p>'
      : '';
    const settlementNotice = order.isSimulated || order.mode === 'simulation'
      ? '<p class="notice">REGISTRO DE DEMONSTRAÇÃO — nenhuma liquidação real foi feita.</p>'
      : order.status === 'completed' && order.paymentStatus === 'approved'
        ? '<p class="notice">Venda confirmada no sistema.</p>'
        : '<p class="notice">Pedido pendente ou sem pagamento confirmado.</p>';
    const date = new Date(order.createdAt);
    const dateLabel = Number.isNaN(date.getTime()) ? order.createdAt : date.toLocaleString('pt-BR');

    return this.openPrintWindow(
      paperWidthMm,
      `Comprovante ${order.orderNumber}`,
      `<header>
        <h1>${this.escapeHtml(order.tenantName || 'Comprovante da loja')}</h1>
        <p>COMPROVANTE NÃO FISCAL</p>
      </header>
      <div class="rule"></div>
      <p>Pedido: <strong>${this.escapeHtml(order.orderNumber)}</strong></p>
      <p>Data: ${this.escapeHtml(dateLabel)}</p>
      ${printerLabel ? `<p>Caixa: ${this.escapeHtml(printerLabel)}</p>` : ''}
      ${order.customerName ? `<p>Cliente: ${this.escapeHtml(order.customerName)}</p>` : ''}
      ${settlementNotice}
      <div class="rule"></div>
      ${items}
      <div class="rule"></div>
      <div class="row total"><strong>Total</strong><strong>${this.formatCurrency(order.total)}</strong></div>
      <p>Pagamento: ${this.escapeHtml(terminalLabel)}</p>
      ${manualNotice}
      <footer>Este documento não substitui documento fiscal.</footer>`
    );
  }

  printTest(
    storeName: string,
    printerLabel: string,
    paperWidthMm: ReceiptPaperWidthMm
  ): boolean {
    return this.openPrintWindow(
      paperWidthMm,
      'Teste de impressora',
      `<header>
        <h1>${this.escapeHtml(storeName || 'Minha loja')}</h1>
        <p>TESTE DE IMPRESSÃO</p>
      </header>
      <div class="rule"></div>
      <p>Impressora/caixa: ${this.escapeHtml(printerLabel || 'Não identificado')}</p>
      <p>Largura configurada: ${paperWidthMm} mm</p>
      <p>Se este texto saiu legível, o navegador conseguiu enviar a página à impressora selecionada.</p>
      <div class="rule"></div>
      <footer>Impressão pelo diálogo do navegador • sem comunicação direta com o hardware.</footer>`
    );
  }

  private openPrintWindow(
    paperWidthMm: ReceiptPaperWidthMm,
    title: string,
    content: string
  ): boolean {
    if (typeof window === 'undefined') return false;
    const printWindow = window.open('', '_blank', 'popup,width=420,height=680');
    if (!printWindow) return false;

    const safeTitle = this.escapeHtml(title);
    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${safeTitle}</title>
          <style>
            @page { size: ${paperWidthMm}mm auto; margin: 2mm; }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; width: ${paperWidthMm}mm; }
            body { color: #111; font: 10px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace; padding: 2mm; overflow-wrap: anywhere; }
            h1 { font-size: 13px; margin: 0 0 3px; text-align: center; }
            header p, footer { text-align: center; font-size: 9px; }
            p { margin: 3px 0; }
            .rule { border-top: 1px dashed #555; margin: 7px 0; }
            .row { display: flex; justify-content: space-between; gap: 5px; }
            .item { align-items: flex-start; margin: 4px 0; }
            .note { color: #444; font-size: 9px; }
            .total { font-size: 12px; margin: 7px 0; }
            .notice { border: 1px solid #555; padding: 5px; text-align: center; font-size: 9px; }
            footer { margin-top: 12px; }
          </style>
        </head>
        <body>${content}</body>
      </html>`);
    printWindow.document.close();
    printWindow.onafterprint = () => printWindow.close();
    printWindow.focus();
    printWindow.setTimeout(() => printWindow.print(), 250);
    return true;
  }

  private paymentMethodLabel(method: string): string {
    switch (method) {
      case 'pix': return 'PIX';
      case 'credit_card': return 'Cartão de crédito';
      case 'debit_card': return 'Cartão de débito';
      case 'card': return 'Cartão';
      case 'cash': return 'Dinheiro';
      case 'voucher': return 'Voucher';
      case 'room_folio': return 'Comanda';
      default: return 'Pagamento registrado';
    }
  }

  private formatCurrency(value: number): string {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private escapeHtml(value: unknown): string {
    return String(value ?? '').replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return entities[character] || character;
    });
  }
}
