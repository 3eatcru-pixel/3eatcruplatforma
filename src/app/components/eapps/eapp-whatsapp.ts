import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CommunicationsService } from '../../services/communications.service';

interface WhatsAppChat {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  time: string;
  unread: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-whatsapp',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col md:flex-row bg-[#111b21] text-stone-200 font-sans select-none overflow-hidden">
      
      <!-- COLUNA DE CONTATOS / CONVERSAS -->
      <div class="w-full md:w-80 border-r border-[#222d34] flex flex-col bg-[#111b21]">
        <div class="p-3 bg-[#202c33] flex items-center justify-between shrink-0">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white">
              <mat-icon class="text-base">chat</mat-icon>
            </div>
            <strong class="text-xs text-white">WhatsApp Business</strong>
          </div>
          <span class="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-700/50">
            Online
          </span>
        </div>

        <div class="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[#222d34]">
          @for (c of chats(); track c.id) {
            <button
              type="button"
              (click)="selectedChatId.set(c.id)"
              [class]="selectedChatId() === c.id ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'"
              class="w-full p-3 text-left transition-colors flex items-center justify-between cursor-pointer">
              <div class="space-y-0.5 min-w-0 flex-1">
                <div class="flex justify-between items-baseline">
                  <strong class="text-xs text-white truncate">{{ c.name }}</strong>
                  <span class="text-[9px] text-stone-400 font-mono">{{ c.time }}</span>
                </div>
                <p class="text-[11px] text-stone-400 truncate">{{ c.lastMessage }}</p>
              </div>
            </button>
          }
        </div>
      </div>

      <!-- PAINEL DE CONVERSA ATIVA -->
      <div class="flex-1 flex flex-col bg-[#0b141a] overflow-hidden">
        @if (activeChat(); as chat) {
          <div class="p-3 bg-[#202c33] flex items-center justify-between shrink-0">
            <div>
              <strong class="text-xs text-white block">{{ chat.name }}</strong>
              <span class="text-[10px] text-stone-400">{{ chat.phone }}</span>
            </div>
            <span class="text-[10px] text-stone-400">Canal de Pedidos & Suporte</span>
          </div>

          <div class="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-[#202c33] p-2.5 rounded-2xl rounded-tl-none max-w-sm text-xs text-stone-200">
              <p>{{ chat.lastMessage }}</p>
              <span class="text-[9px] text-stone-400 block text-right mt-1 font-mono">{{ chat.time }}</span>
            </div>

            @for (msg of sentMessages(); track msg.id) {
              <div class="ml-auto bg-[#005c4b] p-2.5 rounded-2xl rounded-tr-none max-w-sm text-xs text-white">
                <p>{{ msg.text }}</p>
                <span class="text-[9px] text-emerald-200 block text-right mt-1 font-mono">{{ msg.time }}</span>
              </div>
            }
          </div>

          <!-- INPUT DE RESPOSTA -->
          <div class="p-3 bg-[#202c33] flex items-center gap-2 shrink-0">
            <input
              type="text"
              [value]="replyText()"
              (input)="replyText.set($any($event.target).value)"
              (keyup.enter)="sendReply()"
              placeholder="Digite uma mensagem ou resposta rápida..."
              class="flex-1 bg-[#2a3942] border-none text-white text-xs p-2.5 rounded-xl outline-none" />
            <button
              type="button"
              (click)="sendReply()"
              class="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl cursor-pointer">
              <mat-icon class="text-sm">send</mat-icon>
            </button>
          </div>
        }
      </div>

    </div>
  `
})
export class EAppWhatsappWindow {
  readonly comms = inject(CommunicationsService);

  readonly selectedChatId = signal<string>('c1');
  readonly replyText = signal<string>('');

  readonly chats = signal<WhatsAppChat[]>([
    { id: 'c1', name: 'Marina Albuquerque', phone: '(11) 98765-4321', lastMessage: 'Olá! Meu pedido #9048 já saiu para entrega?', time: '12:45', unread: 1 },
    { id: 'c2', name: 'Carlos Eduardo', phone: '(11) 99123-8844', lastMessage: 'Gostaria de reservar uma mesa para 4 pessoas hoje.', time: '11:20', unread: 0 },
    { id: 'c3', name: 'Juliana Costa', phone: '(11) 97321-1199', lastMessage: 'Vocês têm opção sem glúten no cardápio?', time: '10:05', unread: 0 }
  ]);

  readonly sentMessages = signal<{ id: string; text: string; time: string }[]>([]);

  activeChat() {
    return this.chats().find(c => c.id === this.selectedChatId());
  }

  sendReply() {
    const txt = this.replyText().trim();
    if (!txt) return;
    this.sentMessages.update(msgs => [
      ...msgs,
      { id: 'msg-' + Date.now(), text: txt, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    this.replyText.set('');
  }
}
