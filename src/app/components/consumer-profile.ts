import { ChangeDetectionStrategy, Component, inject, signal, computed, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { EcosystemService } from '../services/ecosystem.service';
import { ConsumerAccount, OrderTransaction } from '../models/ecosystem.model';

@Component({
  selector: 'app-consumer-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="bg-[#180e07] border-2 border-[#4d2813] rounded-3xl p-5 sm:p-7 shadow-[0_10px_40px_rgba(0,0,0,0.8)] text-stone-200 relative overflow-hidden font-sans">
      
      <!-- BACKGROUND AMBIENT GLOW -->
      <div class="absolute -top-16 -right-16 w-48 h-48 bg-amber-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <!-- HEADER WITH TITLE AND CLOSE BUTTON -->
      <div class="flex items-center justify-between pb-4 border-b border-[#3d200f] mb-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700 text-stone-950 flex items-center justify-center font-black shadow-md shrink-0">
            <mat-icon class="text-xl">person</mat-icon>
          </div>
          <div>
            <div class="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest leading-none">
              CENTRAL DO CONSUMIDOR • 3EAT
            </div>
            <h3 class="text-base sm:text-lg font-serif font-black text-stone-100 leading-tight">
              {{ isLogged() ? 'Meu Perfil & Pedidos' : (activeTab() === 'login' ? 'Entrar como Consumidor' : 'Criar Perfil de Consumidor') }}
            </h3>
          </div>
        </div>

        <div class="flex items-center gap-2">
          @if (isModal()) {
            <button
              type="button"
              (click)="closeProfile.emit()"
              class="w-8 h-8 rounded-xl bg-[#2a160b] hover:bg-[#3d200f] text-stone-400 hover:text-white flex items-center justify-center border border-[#482814] transition-all cursor-pointer">
              <mat-icon class="text-sm">close</mat-icon>
            </button>
          }
        </div>
      </div>

      <!-- TAB SELECTOR IF NOT LOGGED IN -->
      @if (!isLogged()) {
        <div class="flex bg-[#100905] border border-[#3b1e0d] p-1 rounded-2xl mb-5">
          <button
            type="button"
            (click)="activeTab.set('login')"
            [class]="activeTab() === 'login' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black shadow' : 'text-stone-400 hover:text-stone-200 font-bold'"
            class="flex-1 py-2 text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer">
            <mat-icon class="text-xs">login</mat-icon>
            <span>Já tenho Conta</span>
          </button>
          <button
            type="button"
            (click)="activeTab.set('register')"
            [class]="activeTab() === 'register' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black shadow' : 'text-stone-400 hover:text-stone-200 font-bold'"
            class="flex-1 py-2 text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer">
            <mat-icon class="text-xs">person_add</mat-icon>
            <span>Criar Meu Perfil (+50 pts)</span>
          </button>
        </div>
      }

      <!-- STATE 1: ALREADY LOGGED IN AS CONSUMER -->
      @if (isLogged()) {
        @let consumer = activeConsumer()!;
        <div class="space-y-5">
          
          <!-- CONSUMER BADGE HERO CARD -->
          <div class="bg-gradient-to-br from-[#2a160b] to-[#1f0f07] border border-[#522911] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
            <div class="flex items-center gap-3.5">
              <div class="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-500 text-amber-300 flex items-center justify-center font-black text-xl shadow-inner shrink-0">
                {{ consumer.name.charAt(0) }}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-serif font-black text-stone-100 text-base leading-tight">{{ consumer.name }}</span>
                  <span class="bg-emerald-950/80 text-emerald-300 border border-emerald-600/60 text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase">
                    Cliente Ativo
                  </span>
                </div>
                <div class="text-xs text-stone-400 font-mono mt-0.5">{{ consumer.email }}</div>
                <div class="text-[11px] text-amber-400 font-medium flex items-center gap-1 mt-1">
                  <mat-icon class="text-xs">call</mat-icon>
                  <span>{{ consumer.phone }}</span>
                  @if (consumer.cpf) {
                    <span class="text-stone-600">•</span>
                    <span class="text-stone-400">CPF: {{ consumer.cpf }}</span>
                  }
                </div>
              </div>
            </div>

            <!-- LOYALTY & SPENT SUMMARY -->
            <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-[#3d200f]">
              <div class="bg-[#140a04] border border-[#3b1e0d] px-3.5 py-2 rounded-xl text-center">
                <div class="text-[9px] font-mono text-stone-400 uppercase font-bold">{{ ecosystem.isSimulationMode() ? 'PONTOS DEMONSTRATIVOS' : 'FIDELIDADE' }}</div>
                @if (ecosystem.isSimulationMode()) {
                  <div class="text-amber-400 font-serif font-black text-sm flex items-center justify-center gap-1">
                    <mat-icon class="text-xs text-amber-500">stars</mat-icon>
                    <span>{{ consumer.loyaltyPoints || 50 }}</span>
                  </div>
                } @else {
                  <div class="text-stone-400 font-mono text-xs">Indisponível</div>
                }
              </div>

              <div class="bg-[#140a04] border border-[#3b1e0d] px-3.5 py-2 rounded-xl text-center">
                <div class="text-[9px] font-mono text-stone-400 uppercase font-bold">PEDIDOS FEITOS</div>
                <div class="text-stone-200 font-mono font-black text-sm">{{ consumerOrders().length }}</div>
              </div>
            </div>
          </div>

          <!-- SUB-TABS: ENDEREÇOS VS HISTÓRICO DE PEDIDOS -->
          <div class="flex gap-2 border-b border-[#3d200f] pb-2 text-xs">
            <button
              type="button"
              (click)="profileSubTab.set('addresses')"
              [class]="profileSubTab() === 'addresses' ? 'text-amber-400 border-b-2 border-amber-500 font-black' : 'text-stone-400 hover:text-stone-200 font-bold'"
              class="pb-1 px-2 flex items-center gap-1.5 transition-colors cursor-pointer">
              <mat-icon class="text-xs">place</mat-icon>
              <span>Endereço de Entrega</span>
            </button>

            <button
              type="button"
              (click)="profileSubTab.set('orders')"
              [class]="profileSubTab() === 'orders' ? 'text-amber-400 border-b-2 border-amber-500 font-black' : 'text-stone-400 hover:text-stone-200 font-bold'"
              class="pb-1 px-2 flex items-center gap-1.5 transition-colors cursor-pointer">
              <mat-icon class="text-xs">receipt_long</mat-icon>
              <span>Meus Pedidos ({{ consumerOrders().length }})</span>
            </button>

            <button
              type="button"
              (click)="profileSubTab.set('edit')"
              [class]="profileSubTab() === 'edit' ? 'text-amber-400 border-b-2 border-amber-500 font-black' : 'text-stone-400 hover:text-stone-200 font-bold'"
              class="pb-1 px-2 flex items-center gap-1.5 transition-colors cursor-pointer">
              <mat-icon class="text-xs">edit</mat-icon>
              <span>Editar Dados</span>
            </button>
          </div>

          <!-- SUB-VIEW 1: ADDRESSES -->
          @if (profileSubTab() === 'addresses') {
            <div class="space-y-3">
              <div class="bg-[#241309] border border-[#482814] rounded-2xl p-4 flex items-start justify-between gap-3">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-stone-100 flex items-center gap-1">
                      <mat-icon class="text-xs text-amber-500">home</mat-icon>
                      <span>Endereço Principal</span>
                    </span>
                    <span class="text-[9px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.2 rounded font-mono">Padrão</span>
                  </div>
                  <div class="text-xs text-stone-300 font-medium">{{ consumer.primaryAddress }}</div>
                  <div class="text-[11px] text-stone-400 font-mono">{{ consumer.neighborhood }} • {{ consumer.city }}</div>
                </div>

                <button
                  type="button"
                  (click)="setAsReferenceGps(consumer)"
                  class="bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-600/40 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0">
                  <mat-icon class="text-xs">my_location</mat-icon>
                  <span>Usar no GPS</span>
                </button>
              </div>

              <div class="text-[11px] text-stone-400 flex items-center gap-1.5 font-medium px-1">
                <mat-icon class="text-xs text-amber-500">info</mat-icon>
                <span>Este endereço é usado automaticamente para calcular o frete e tempo estimado nas lojas do marketplace.</span>
              </div>
            </div>
          }

          <!-- SUB-VIEW 2: RECENT ORDERS -->
          @if (profileSubTab() === 'orders') {
            <div class="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              @if (consumerOrders().length === 0) {
                @if (consumerOrdersStatus() === 'loading') {
                  <div role="status" class="bg-[#241309] border border-[#482814] rounded-2xl p-6 text-center text-xs text-stone-300">Carregando seu histórico de pedidos…</div>
                } @else if (consumerOrdersStatus() === 'error') {
                  <div role="alert" class="bg-[#241309] border border-rose-800 rounded-2xl p-6 text-center space-y-2">
                    <div class="text-xs text-rose-200">Não foi possível carregar seu histórico agora.</div>
                    <button type="button" (click)="loadConsumerOrderHistory()" class="text-xs font-bold text-amber-300 underline">Tentar novamente</button>
                  </div>
                } @else {
                <div class="bg-[#241309] border border-dashed border-[#482814] rounded-2xl p-6 text-center space-y-2">
                  <mat-icon class="text-3xl text-stone-500">shopping_bag</mat-icon>
                  <div class="text-xs text-stone-300 font-bold">Nenhum pedido realizado ainda</div>
                  <div class="text-[11px] text-stone-500">Explore o marketplace e faça seu primeiro pedido!</div>
                  <button
                    type="button"
                    (click)="goToMarketplace()"
                    class="bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black text-xs px-4 py-2 rounded-xl shadow cursor-pointer mt-2 inline-flex items-center gap-1">
                    <span>Explorar Cardápios</span>
                    <mat-icon class="text-xs">arrow_forward</mat-icon>
                  </button>
                </div>
                }
              } @else {
                @for (order of consumerOrders(); track order.id) {
                  <div class="bg-[#241309] border border-[#482814] rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div class="space-y-1">
                      <div class="flex items-center gap-2">
                        <span class="font-mono font-bold text-amber-400">#{{ order.orderNumber }}</span>
                        <span class="text-stone-300 font-serif font-black">{{ getTenantName(order.tenantId) }}</span>
                        <span
                          [class]="(order.status === 'completed' || order.status === 'delivered') ? 'bg-emerald-950 text-emerald-400 border-emerald-700' : order.status === 'dispatched' ? 'bg-purple-950 text-purple-300 border-purple-700' : 'bg-amber-950 text-amber-400 border-amber-700'"
                          class="text-[9px] font-mono px-2 py-0.5 rounded-full border font-bold uppercase">
                          {{ order.status === 'dispatched' ? 'em rota' : order.status }}
                        </span>
                      </div>
                      <div class="text-[11px] text-stone-400">
                        {{ order.createdAt }} • {{ order.items.length }} item(ns)
                      </div>
                      <div class="text-[10px] text-stone-500 truncate max-w-sm">
                        {{ getItemsSummary(order) }}
                      </div>
                    </div>

                    <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-[#3d200f]">
                      <div class="font-mono font-black text-amber-400 text-sm">
                        R$ {{ order.total.toFixed(2) }}
                      </div>
                      <button
                        type="button"
                        (click)="viewOrderStore(order.tenantId)"
                        class="bg-[#381c0c] hover:bg-[#4a2610] text-amber-300 border border-[#5a2f14] text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1">
                        <mat-icon class="text-xs">storefront</mat-icon>
                        <span>Pedir de Novo</span>
                      </button>
                    </div>
                  </div>
                }
              }
            </div>
          }

          <!-- SUB-VIEW 3: EDIT PROFILE -->
          @if (profileSubTab() === 'edit') {
            <form [formGroup]="editForm" (ngSubmit)="saveProfileEdits()" class="space-y-3 text-xs">
              <div>
                <label for="editName" class="block font-bold text-stone-300 mb-1">Nome Completo</label>
                <input
                  id="editName"
                  type="text"
                  formControlName="name"
                  class="w-full bg-[#120a05] border border-[#482814] rounded-xl px-3 py-2 text-stone-100 font-medium focus:outline-none focus:border-amber-500">
              </div>

              <div>
                  <label for="editPhone" class="block font-bold text-stone-300 mb-1">Telefone / WhatsApp</label>
                  <input
                    id="editPhone"
                    type="text"
                    formControlName="phone"
                    class="w-full bg-[#120a05] border border-[#482814] rounded-xl px-3 py-2 text-stone-100 font-medium focus:outline-none focus:border-amber-500">
              </div>

              <div>
                <label for="editAddr" class="block font-bold text-stone-300 mb-1">Endereço de Entrega</label>
                <input
                  id="editAddr"
                  type="text"
                  formControlName="primaryAddress"
                  class="w-full bg-[#120a05] border border-[#482814] rounded-xl px-3 py-2 text-stone-100 font-medium focus:outline-none focus:border-amber-500">
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="editNeigh" class="block font-bold text-stone-300 mb-1">Bairro</label>
                  <input
                    id="editNeigh"
                    type="text"
                    formControlName="neighborhood"
                    class="w-full bg-[#120a05] border border-[#482814] rounded-xl px-3 py-2 text-stone-100 font-medium focus:outline-none focus:border-amber-500">
                </div>
                <div>
                  <label for="editCity" class="block font-bold text-stone-300 mb-1">Cidade</label>
                  <input
                    id="editCity"
                    type="text"
                    formControlName="city"
                    class="w-full bg-[#120a05] border border-[#482814] rounded-xl px-3 py-2 text-stone-100 font-medium focus:outline-none focus:border-amber-500">
                </div>
              </div>

              <div class="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  (click)="profileSubTab.set('addresses')"
                  class="bg-[#241309] hover:bg-[#381c0c] text-stone-300 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer border border-[#482814]">
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="editForm.invalid"
                  class="bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black px-5 py-2 rounded-xl text-xs shadow-md cursor-pointer disabled:opacity-50">
                  Salvar Alterações
                </button>
              </div>
            </form>
          }

          <!-- FOOTER ACTIONS FOR LOGGED CONSUMER -->
          <div class="pt-4 border-t border-[#3d200f] flex flex-wrap items-center justify-between gap-3 text-xs">
            <button
              type="button"
              (click)="goToMarketplace()"
              class="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-stone-950 font-black px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer">
              <mat-icon class="text-xs">storefront</mat-icon>
              <span>Explorar Marketplace</span>
            </button>

            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="switchAccount()"
                class="bg-[#2a160b] hover:bg-[#3d200f] text-stone-300 hover:text-white px-3 py-2 rounded-xl border border-[#482814] font-bold text-xs cursor-pointer">
                Trocar Perfil
              </button>

              <button
                type="button"
                (click)="doLogout()"
                class="bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 px-3 py-2 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1">
                <mat-icon class="text-xs">logout</mat-icon>
                <span>Sair</span>
              </button>
            </div>
          </div>

        </div>
      }

      <!-- STATE 2: NOT LOGGED - LOGIN VIEW -->
      @if (!isLogged() && activeTab() === 'login') {
        <div class="space-y-4 text-xs">
          @if (ecosystem.isSimulationMode()) {
          <div>
            <label for="consumerEmailLogin" class="block font-bold text-stone-300 mb-1">E-mail Cadastrado</label>
            <div class="flex gap-2">
              <input
                id="consumerEmailLogin"
                type="email"
                [value]="loginEmailInput()"
                (input)="loginEmailInput.set($any($event.target).value)"
                placeholder="seuemail@exemplo.com"
                class="flex-1 bg-[#120a05] border border-[#482814] rounded-xl px-3.5 py-2.5 text-stone-100 font-medium focus:outline-none focus:border-amber-500 placeholder:text-stone-600">
              <button
                type="button"
                (click)="submitEmailLogin()"
                class="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black px-5 py-2.5 rounded-xl shadow-md cursor-pointer flex items-center gap-1">
                <span>Entrar</span>
                <mat-icon class="text-xs">arrow_forward</mat-icon>
              </button>
            </div>
          </div>

          <!-- FAST SELECTOR FOR REGISTERED PROFILES (DEMO & EXISTING) -->
          <div class="pt-2">
            <div class="text-[10px] font-mono text-stone-400 uppercase font-bold mb-2 flex items-center justify-between">
              <span>Perfis desta demonstração:</span>
              <span class="text-amber-500">Acesso Direto</span>
            </div>

            <div class="space-y-2">
              @for (account of ecosystem.consumerAccounts(); track account.id) {
                <div class="bg-[#241309] hover:bg-[#341b0d] border border-[#482814] rounded-2xl p-3 flex items-center justify-between gap-3 transition-colors">
                  <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-600/40 text-amber-400 flex items-center justify-center font-black">
                      {{ account.name.charAt(0) }}
                    </div>
                    <div>
                      <div class="font-bold text-stone-100 text-xs flex items-center gap-1.5">
                        <span>{{ account.name }}</span>
                        @if (account.status === 'blocked') {
                          <span class="bg-rose-950 text-rose-300 border border-rose-800 text-[8px] px-1 rounded font-mono">Bloqueado</span>
                        }
                      </div>
                      <div class="text-[10px] text-stone-400 font-mono">{{ account.email }} • {{ account.primaryAddress }}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    [disabled]="account.status === 'blocked'"
                    (click)="selectAccount(account)"
                    class="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-stone-950 font-black text-xs px-3.5 py-1.5 rounded-xl shadow cursor-pointer">
                    Acessar
                  </button>
                </div>
              }
            </div>
          </div>
          } @else {
            <div role="status" class="rounded-2xl border border-emerald-600/40 bg-emerald-950/30 p-4 text-stone-300">
              Entre com sua conta Google para acessar seu perfil e seus pedidos com segurança.
            </div>
            <button
              type="button"
              [disabled]="isSubmittingProfile()"
              (click)="authenticateConsumerWithGoogle()"
              class="w-full bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black px-5 py-3 rounded-xl shadow-md cursor-pointer disabled:opacity-50">
              {{ isSubmittingProfile() ? 'Conectando…' : 'Continuar com Google' }}
            </button>
          }

          <div class="pt-2 text-center">
            <button
              type="button"
              (click)="activeTab.set('register')"
              class="text-xs text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer">
              Não tem um perfil? Cadastre-se em 30 segundos
            </button>
          </div>
        </div>
      }

      <!-- STATE 3: NOT LOGGED - REGISTRATION VIEW -->
      @if (!isLogged() && activeTab() === 'register') {
        <form [formGroup]="registerForm" (ngSubmit)="submitRegister()" class="space-y-3 text-xs">
          
          <div class="bg-amber-950/40 border border-amber-600/30 rounded-2xl p-3 flex items-center gap-2.5 text-amber-300">
            <mat-icon class="text-lg text-amber-400 shrink-0">redeem</mat-icon>
            <div class="text-[11px] leading-tight">
              @if (ecosystem.isSimulationMode()) {
                <strong>Demonstração:</strong> pontos e perfil ficam somente nesta sessão simulada.
              } @else {
                <strong>Perfil protegido:</strong> entre com Google. O programa de pontos ainda não está ativo.
              }
            </div>
          </div>

          @if (!ecosystem.isSimulationMode() && ecosystem.currentSession()?.role !== 'consumer') {
            <button
              type="button"
              [disabled]="isSubmittingProfile()"
              (click)="authenticateConsumerWithGoogle()"
              class="w-full bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black px-5 py-2.5 rounded-xl shadow-md cursor-pointer disabled:opacity-50">
              {{ isSubmittingProfile() ? 'Conectando…' : 'Autenticar com Google para continuar' }}
            </button>
          }

          <div>
            <label for="regName" class="block font-bold text-stone-300 mb-1">Nome Completo *</label>
            <input
              id="regName"
              type="text"
              formControlName="name"
              placeholder="Ex: Mariana Vasconcelos"
              class="w-full bg-[#120a05] border border-[#482814] rounded-xl px-3 py-2 text-stone-100 font-medium focus:outline-none focus:border-amber-500 placeholder:text-stone-600">
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="regEmail" class="block font-bold text-stone-300 mb-1">E-mail *</label>
              <input
                id="regEmail"
                type="email"
                formControlName="email"
                [readonly]="!ecosystem.isSimulationMode() && ecosystem.currentSession()?.role === 'consumer'"
                placeholder="mariana@exemplo.com"
                class="w-full bg-[#120a05] border border-[#482814] rounded-xl px-3 py-2 text-stone-100 font-medium focus:outline-none focus:border-amber-500 placeholder:text-stone-600">
            </div>

            <div>
              <label for="regPhone" class="block font-bold text-stone-300 mb-1">WhatsApp / Telefone *</label>
              <input
                id="regPhone"
                type="text"
                formControlName="phone"
                placeholder="(11) 98765-4321"
                class="w-full bg-[#120a05] border border-[#482814] rounded-xl px-3 py-2 text-stone-100 font-medium focus:outline-none focus:border-amber-500 placeholder:text-stone-600">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="regCity" class="block font-bold text-stone-300 mb-1">Cidade *</label>
              <input
                id="regCity"
                type="text"
                formControlName="city"
                placeholder="São Paulo"
                class="w-full bg-[#120a05] border border-[#482814] rounded-xl px-3 py-2 text-stone-100 font-medium focus:outline-none focus:border-amber-500 placeholder:text-stone-600">
            </div>
          </div>

          <div>
            <label for="regAddr" class="block font-bold text-stone-300 mb-1">Endereço de Entrega Principal *</label>
            <input
              id="regAddr"
              type="text"
              formControlName="primaryAddress"
              placeholder="Rua / Avenida, Número e Complemento"
              class="w-full bg-[#120a05] border border-[#482814] rounded-xl px-3 py-2 text-stone-100 font-medium focus:outline-none focus:border-amber-500 placeholder:text-stone-600">
          </div>

          <div>
            <label for="regNeigh" class="block font-bold text-stone-300 mb-1">Bairro *</label>
            <input
              id="regNeigh"
              type="text"
              formControlName="neighborhood"
              placeholder="Ex: Pinheiros / Vila Mariana"
              class="w-full bg-[#120a05] border border-[#482814] rounded-xl px-3 py-2 text-stone-100 font-medium focus:outline-none focus:border-amber-500 placeholder:text-stone-600">
          </div>

          <div class="pt-3 flex items-center justify-between">
            <button
              type="button"
              (click)="activeTab.set('login')"
              class="text-xs text-stone-400 hover:text-stone-200 font-bold underline cursor-pointer">
              Já tenho cadastro
            </button>

            <button
              type="submit"
              [disabled]="registerForm.invalid"
              class="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-black px-6 py-2.5 rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all">
              <mat-icon class="text-xs">check_circle</mat-icon>
              <span>Criar Perfil &amp; Entrar</span>
            </button>
          </div>

        </form>
      }

    </div>
  `
})
export class ConsumerProfileComponent {
  readonly ecosystem = inject(EcosystemService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private profileHydrationKey: string | null = null;
  private consumerOrdersLoadGeneration = 0;

  // Inputs / Outputs for Modal and Reusable Integration
  readonly isModal = input<boolean>(true);
  readonly closeProfile = output<void>();

  readonly activeTab = signal<'login' | 'register'>('login');
  readonly profileSubTab = signal<'addresses' | 'orders' | 'edit'>('addresses');
  readonly loginEmailInput = signal<string>('');
  readonly isSubmittingProfile = signal(false);
  readonly consumerOrdersStatus = signal<'idle' | 'loading' | 'loaded' | 'error'>('idle');

  readonly activeConsumer = computed(() => this.ecosystem.activeConsumer());
  readonly isLogged = computed(() => !!this.ecosystem.activeConsumer());

  readonly consumerOrders = computed(() => {
    const cons = this.ecosystem.activeConsumer();
    if (!cons) return [];
    return this.ecosystem.orders().filter(order => order.customerId === cons.id);
  });

  readonly registerForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.minLength(8)]],
    primaryAddress: ['', [Validators.required, Validators.minLength(5)]],
    neighborhood: ['', [Validators.required]],
    city: ['São Paulo', [Validators.required]]
  });

  readonly editForm = this.fb.group({
    name: ['', [Validators.required]],
    phone: ['', [Validators.required]],
    primaryAddress: ['', [Validators.required]],
    neighborhood: ['', [Validators.required]],
    city: ['', [Validators.required]]
  });

  constructor() {
    const cur = this.ecosystem.activeConsumer();
    if (cur) {
      this.editForm.patchValue({
        name: cur.name,
        phone: cur.phone,
        primaryAddress: cur.primaryAddress,
        neighborhood: cur.neighborhood,
        city: cur.city
      });
    }
    effect(() => {
      const authReady = this.ecosystem.security.authInitialized();
      const simulated = this.ecosystem.isSimulationMode();
      const session = this.ecosystem.currentSession();
      this.ecosystem.security.executionModeRevision();
      if (!authReady) return;
      if (simulated) {
        this.consumerOrdersLoadGeneration += 1;
        this.consumerOrdersStatus.set('loaded');
      } else if (session?.role === 'consumer') {
        void this.hydrateAuthenticatedConsumer();
      } else {
        this.consumerOrdersLoadGeneration += 1;
        this.consumerOrdersStatus.set('idle');
      }
    });
  }

  submitEmailLogin() {
    if (!this.ecosystem.isSimulationMode()) {
      this.ecosystem.notify('Use Continuar com Google para autenticar e recuperar seu perfil.', 'info');
      return;
    }
    const email = this.loginEmailInput().trim();
    if (!email) {
      this.ecosystem.notify('Digite seu e-mail cadastrado.', 'warning');
      return;
    }
    const success = this.ecosystem.loginConsumer(email);
    if (success) {
      this.loginEmailInput.set('');
      const consumer = this.ecosystem.activeConsumer();
      if (consumer) this.patchProfileForms(consumer);
    }
  }

  selectAccount(account: ConsumerAccount) {
    if (!this.ecosystem.isSimulationMode()) return;
    this.ecosystem.loginConsumer(account.id);
    this.patchProfileForms(account);
  }

  async authenticateConsumerWithGoogle() {
    if (this.isSubmittingProfile()) return;
    this.isSubmittingProfile.set(true);
    try {
      this.ecosystem.security.setPillar('consumer');
      const session = await this.ecosystem.security.loginWithGoogle();
      if (!session || session.role !== 'consumer') {
        throw new Error('Não foi possível abrir uma sessão de consumidor. Tente novamente.');
      }
      const profile = await this.ecosystem.crmService.fetchOwnConsumerProfile();
      if (profile) {
        this.patchProfileForms(profile);
        this.ecosystem.notify('Perfil de consumidor carregado.', 'success');
      } else {
        this.registerForm.patchValue({ name: session.name, email: session.email });
        this.activeTab.set('register');
        this.ecosystem.notify('Conta autenticada. Complete os dados do perfil para continuar.', 'info');
      }
      await this.loadConsumerOrderHistory(session);
    } catch (error: unknown) {
      const message = (error as { message?: string })?.message;
      this.ecosystem.notify(message || 'Não foi possível autenticar com Google.', 'error');
    } finally {
      this.isSubmittingProfile.set(false);
    }
  }

  async submitRegister() {
    if (this.isSubmittingProfile()) return;
    if (!this.ecosystem.isSimulationMode() && this.ecosystem.currentSession()?.role !== 'consumer') {
      this.ecosystem.notify('Autentique-se com Google antes de cadastrar seu perfil.', 'warning');
      return;
    }
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    const val = this.registerForm.value;
    this.isSubmittingProfile.set(true);
    try {
      const registered = await this.ecosystem.registerConsumer({
        name: val.name!,
        email: val.email!,
        phone: val.phone!,
        primaryAddress: val.primaryAddress!,
        neighborhood: val.neighborhood!,
        city: val.city!
      });
      this.patchProfileForms(registered);
      this.registerForm.reset({ city: 'São Paulo' });
      await this.loadConsumerOrderHistory();
    } catch (error: unknown) {
      const message = (error as { message?: string })?.message;
      this.ecosystem.notify(message || 'Não foi possível criar seu perfil agora.', 'error');
    } finally {
      this.isSubmittingProfile.set(false);
    }
  }

  async saveProfileEdits() {
    if (this.isSubmittingProfile()) return;
    const cur = this.ecosystem.activeConsumer();
    if (!cur || this.editForm.invalid) return;
    const val = this.editForm.value;
    this.isSubmittingProfile.set(true);
    try {
      await this.ecosystem.updateConsumerProfile(cur.id, {
        name: val.name!,
        phone: val.phone!,
        primaryAddress: val.primaryAddress!,
        neighborhood: val.neighborhood!,
        city: val.city!
      });
      this.profileSubTab.set('addresses');
    } catch (error: unknown) {
      const message = (error as { message?: string })?.message;
      this.ecosystem.notify(message || 'Não foi possível salvar seu perfil agora.', 'error');
    } finally {
      this.isSubmittingProfile.set(false);
    }
  }

  private async hydrateAuthenticatedConsumer() {
    try {
      const session = await this.ecosystem.security.waitForAuth();
      if (!session || session.role !== 'consumer' || this.ecosystem.isSimulationMode()) return;
      const key = `${session.id || session.email}:${this.ecosystem.security.executionModeRevision()}`;
      if (key === this.profileHydrationKey) return;
      this.profileHydrationKey = key;
      const profile = await this.ecosystem.crmService.fetchOwnConsumerProfile();
      if (profile) {
        this.patchProfileForms(profile);
      } else {
        this.registerForm.patchValue({ name: session.name, email: session.email });
        this.activeTab.set('register');
      }
      await this.loadConsumerOrderHistory(session);
    } catch (error: unknown) {
      const message = (error as { message?: string })?.message;
      this.ecosystem.notify(message || 'Não foi possível carregar seu perfil.', 'error');
    }
  }

  async loadConsumerOrderHistory(session = this.ecosystem.currentSession()): Promise<void> {
    if (this.ecosystem.isSimulationMode()) {
      this.consumerOrdersLoadGeneration += 1;
      this.consumerOrdersStatus.set('loaded');
      return;
    }
    if (session?.role !== 'consumer') {
      this.consumerOrdersStatus.set('idle');
      return;
    }

    const revision = this.ecosystem.security.executionModeRevision();
    const uid = session.id;
    const requestId = ++this.consumerOrdersLoadGeneration;
    this.consumerOrdersStatus.set('loading');
    try {
      await this.ecosystem.ordersService.fetchOrders(undefined, 200);
      if (
        requestId !== this.consumerOrdersLoadGeneration ||
        revision !== this.ecosystem.security.executionModeRevision() ||
        this.ecosystem.currentSession()?.id !== uid ||
        this.ecosystem.isSimulationMode()
      ) return;
      this.consumerOrdersStatus.set('loaded');
    } catch {
      if (
        requestId !== this.consumerOrdersLoadGeneration ||
        revision !== this.ecosystem.security.executionModeRevision() ||
        this.ecosystem.currentSession()?.id !== uid ||
        this.ecosystem.isSimulationMode()
      ) return;
      this.consumerOrdersStatus.set('error');
    }
  }

  private patchProfileForms(profile: ConsumerAccount): void {
    this.editForm.patchValue({
      name: profile.name,
      phone: profile.phone,
      primaryAddress: profile.primaryAddress,
      neighborhood: profile.neighborhood,
      city: profile.city
    });
  }

  setAsReferenceGps(consumer: ConsumerAccount) {
    this.ecosystem.userReferenceAddress.set(`${consumer.primaryAddress} - ${consumer.neighborhood}, ${consumer.city}`);
    this.ecosystem.notify(`GPS de referência atualizado para seu endereço: ${consumer.neighborhood}`, 'success');
  }

  getTenantName(tenantId: string): string {
    const tenant = this.ecosystem.tenants().find(t => t.id === tenantId);
    return tenant ? tenant.name : 'Loja Credenciada';
  }

  getItemsSummary(order: OrderTransaction): string {
    return order.items.map(i => `${i.quantity}x ${i.product.name}`).join(', ');
  }

  viewOrderStore(tenantId: string) {
    this.ecosystem.openStorefront(tenantId);
    this.closeProfile.emit();
  }

  goToMarketplace() {
    this.ecosystem.openRegionalMarketplace();
    this.closeProfile.emit();
  }

  switchAccount() {
    if (!this.ecosystem.isSimulationMode()) {
      void this.ecosystem.security.logout().catch(() => {
        this.ecosystem.notify('Não foi possível encerrar a sessão agora.', 'error');
      });
      return;
    }
    this.ecosystem.logoutConsumer();
    this.activeTab.set('login');
  }

  doLogout() {
    if (!this.ecosystem.isSimulationMode()) {
      this.closeProfile.emit();
      void this.ecosystem.security.logout().catch(() => {
        this.ecosystem.notify('Não foi possível encerrar a sessão agora.', 'error');
      });
      return;
    }
    this.ecosystem.logoutConsumer();
    this.closeProfile.emit();
  }
}
