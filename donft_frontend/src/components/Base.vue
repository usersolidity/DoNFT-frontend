<template>
  <b-container class="main d-flex min-vh-100 flex-column" role="main" fluid>
    <b-row>
      <b-col>
        <b-navbar toggleable="lg" type="dark" variant="dark">
          <b-navbar-brand class="text-white" style="padding-left: 0.5rem;" href="/">DO[NFT]</b-navbar-brand>

          <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>

        <b-collapse id="nav-collapse" is-nav >
          <b-navbar-nav v-if="accountAddress !== null" class="ms-auto">
            <b-nav-text style="padding-top:16px;">
                {{ balance }} ETH
            </b-nav-text>
            <b-nav-text>
              <ChainBrowserLink css-class="nav-link"
                                :hash="accountAddress"
                                chain-name="ether"
                                :net-name="netName"
                                :short="true"
                                hash-kind="address"/>
            </b-nav-text>
            <b-nav-item>
              <b-button class="btn" variant="light"  @click="handleDisconnect">Disconnect</b-button>
            </b-nav-item>
          </b-navbar-nav>
        </b-collapse>
      </b-navbar>
      </b-col>
    </b-row>
    <b-row>
      <b-col fluid>
        <div v-if="!networkIsCorrect" class="alert alert-secondary" role="alert">
          We currently operate only on {{netName}} right now. Please, change your net accordingly.
        </div>
      </b-col>
    </b-row>
    <b-row>
      <b-col fluid>
        <router-view></router-view>
      </b-col>
    </b-row>
    <b-row class="mt-auto ">
      <b-col class="m-auto">
        <b-navbar toggleable="lg" type="dark" variant="dark" >
          <b-navbar-nav class="mx-auto">
            <b-nav-item :href="twitterLink" >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-twitter" viewBox="0 0 16 16">
                <path d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.006-.422A6.685 6.685 0 0 0 16 3.542a6.658 6.658 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.325 9.325 0 0 1-6.767-3.429 3.289 3.289 0 0 0 1.018 4.382A3.323 3.323 0 0 1 .64 6.575v.045a3.288 3.288 0 0 0 2.632 3.218 3.203 3.203 0 0 1-.865.115 3.23 3.23 0 0 1-.614-.057 3.283 3.283 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .78 13.58a6.32 6.32 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15z"/>
              </svg>
            </b-nav-item>
            <b-nav-item :href="'mailto:' + email" >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-envelope" viewBox="0 0 16 16">
                <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z"/>
              </svg>
            </b-nav-item>
          </b-navbar-nav>
        </b-navbar>
      </b-col>
    </b-row>
  </b-container>
</template>

<script>
import {mapGetters} from "vuex";
import ChainBrowserLink from "../components/ChainBrowserLink"

export default {
  name: "Base",
  components: {
    ChainBrowserLink
  },
  data () {
    return {
      email: process.env.VUE_APP_EMAIL,
      twitterLink: process.env.VUE_APP_TWITTER,
      netName: process.env.VUE_APP_NET_NAME
    }
  },
  methods: {
    async handleDisconnect () {
      await this.$store.dispatch('setEmptyWeb3rovider')
      this.$router.push({'name': 'Home'})
      window.location.reload()
    }
  },
  computed: {
    primaryBg () {
      switch (this.$route.name) {
        case 'Home':
        case 'ChooseEffect':
          return 'bg-lilac'
        default:
          return 'bg-green'
      }
    },
    gradient () {
      switch (this.$route.name) {
        case 'Home':
        case 'ChooseEffect':
          return 'background-grad-lilac'
        default:
          return 'background-grad-green'
      }
    },
    ...mapGetters({
      "balance": "getAccountBalance",
      "accountAddress": "getAccount",
      "networkIsCorrect": "networkIsCorrect",
      "provider": "getEthersProvider"
    }),

  },
  watch: {
    provider (value) {
      if (value !== null) {
        value.on("network", (network, oldNetwork) => {
          this.$store.dispatch("setNetwork", network.name)
          if (oldNetwork) {
            window.location.reload()
          }
        })
      }
    }
  }
}
</script>

<style scoped>
.fixed-row-bottom { 
  margin-bottom: 0px;
}
</style>