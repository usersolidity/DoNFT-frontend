<template>
  <div id="app">
    <Base></Base>
    <web3-modal-vue
        ref="web3modal"
        :theme="theme"
        :provider-options="providerOptions"
        :cache-provider="false"
    />
  </div>
</template>

<script>
import Base from "./components/Base";
import Web3ModalVue from "web3modal-vue";
import WalletConnectProvider from "@walletconnect/web3-provider";

export default {
  name: 'App',
  components: {
    Base,
    Web3ModalVue
  },
  data () {
    return {
      theme: 'light',
      providerOptions: {
        walletconnect: {
          package: WalletConnectProvider,
          options: {
            infuraId: "6c3a9507f03a49589e3cb762331f2026"
          }
        }
      },
    }
  },
  created() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.theme = 'dark'
    }
  },
  async beforeMount() {
    await this.$store.dispatch('setIpfs')
  },
  mounted() {
    this.$nextTick(async () => {
      const web3modal = this.$refs.web3modal;
      this.$store.commit('SET_WEB3_MODAL', web3modal)
      if (web3modal.cachedProvider) {
        await this.$store.dispatch('setWeb3EhereumProvider')
      }

    })
  },
}
</script>

<style>
</style>
