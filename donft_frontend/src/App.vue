<template>
  <div id="app">
    <Base></Base>
  </div>
</template>

<script>
import Base from "./components/Base";
export default {
  name: 'App',
  components: {
    Base
  },
  async beforeMount() {
    await this.$store.dispatch('setIpfs')
  }
}
</script>

<style>
</style>
