<template>
  <a :class="cssClass" :href="href" target="_blank"><u>{{displayedHash}}</u></a>
</template>

<script>
export default {
  name: "ChainBrowserLink",
  props: [
      'cssClass',
      'chainName',
      'hash',
      'netName',
      'short',
      'hashKind'
  ],
  computed: {
    href () {
      if (this.chainName === 'ether') {
        return `https://${this.netName}.etherscan.io/${this.hashKind}/${this.hash}`
      }
      return ""
    },
    displayedHash () {
      if (this.short) {
        return this.hash.slice(0, 8)
      } else {
        return this.hash
      }
    }
  }
}
</script>

<style scoped>

</style>