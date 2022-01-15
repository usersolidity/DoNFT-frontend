<template>
  <div class="container pt-4">
    <div class="row">
      <div class="col-8">
          <h1 class="display-3">Make more from your NFTS!</h1>
          <p class="display-5">Use power of neural network algorithms to create new unique combinations of digital art</p>
          <b-button class="btn" variant="dark" v-if="provider && (address === null)"  @click="connectWallet" >Connect your wallet</b-button>
          <b-button class="btn" variant="dark" v-else-if="provider && (address !== null)"  @click="this.goToChooseNFT" >Browse your wallet</b-button>
          <p v-else>You dont have a wallet! Create one at Metamask</p>
      </div>
      <div class="col-4">
        <img src="@/assets/home_img.jpg" style="height: 30%;  border-radius:20%;" >
      </div>
    </div>
  </div>
</template>

<script>
import {mapGetters} from "vuex";
export default {
  name: "Home",
  methods: {
    goToChooseNFT() {
      this.$router.push({name: 'ChooseNFT'})
    },
    async connectWallet() {
      await this.$store.dispatch('setAccount')
      await this.$store.dispatch('setBalance')
      this.goToChooseNFT()
    }
  },
  async beforeMount() {
    await this.$store.dispatch('setWeb3EhereumProvider')
  },
  computed: {
    ...mapGetters({
      "provider": "getEthersProvider",
      "address": "getAccount"
    }),
  }
}
</script>

<style scoped>

</style>