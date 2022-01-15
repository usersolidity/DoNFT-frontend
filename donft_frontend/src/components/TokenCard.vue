<template>
  <b-container @click="$emit('cardClicked', tokenId)" class="card card-overlay g-0" :class="cardClass">
    <b-row class="g-0">
      <b-col style="height:185px;">
        <img class="card-img-top card-img-fixed" :src="localImage || placeholder()"
           :alt="(meta && meta.name) || 'Unknown'" style="height:100%; object-fit: cover;">
      </b-col>
    </b-row>
    <b-row class="g-0"  align-self="end" style="height:50px; margin-bottom: 0px;">
      <b-col class="card-body p-2">
        <p :class="{'card-title': cardSize === 'standard', 'card-text': cardSize === 'smaller'}">
          {{ shorten(tokenId, 5) }}: {{ shorten(meta && meta.name, 30)  || 'Unknown'}}</p>
      </b-col>
    </b-row>  
  </b-container>
</template>
<script>
import {mapActions, mapGetters} from "vuex";
import {shorten, placeholder} from '../utilities'

export default {
  name: "TokenCard",
  props: [
      'contractAddress',
      'tokenId',
      'cardSize',
      'isChoosable',
      'isChosen'
  ],
  methods: {
    ...mapActions([
        'setTokenURI',
        'setTokenMeta',
        'setTokenImage'
    ]),
    async loadContent () {
      if (!this.uri) {
          await this.setTokenURI({contractAddress: this.contractAddress, tokenId: this.tokenId})
      }
      if (!this.meta) {
        await this.setTokenMeta({contractAddress: this.contractAddress, tokenId: this.tokenId})
      }
      if (!this.localImage) {
        await this.setTokenImage({contractAddress: this.contractAddress, tokenId: this.tokenId})
      }
    },
    shorten,
    placeholder,

  },
  async beforeMount () {
    await this.loadContent()
  },
  computed: {
    ...mapGetters([
        'getTokenById'
    ]),
    self () {
      return this.getTokenById(this.contractAddress, this.tokenId)
    },
    meta () {
      return this.self.meta
    },
    localImage () {
      return this.self.localImage
    },
    uri () {
      return this.self.uri
    },
    cardClass () {
      return {
        'chosen-card': this.isChosen,
        'choosable-card': !this.isChosen && this.isChoosable,
        'standard-card-size': this.cardSize === 'standard',
        'smaller-card-size': this.cardSize === 'smaller'
      }
    }
  }
}
</script>

<style scoped>
.standard-card-size {
    height: 242px;
    width: 168px;
}

.smaller-card-size {
    height: 200px;
    width: 137px;
}

.chosen-card {
    border-color: #43F097;
    border-width: 2px;
}

.rounded-16 {
    border-radius: 16px !important;
}

.card-overlay {
    background: linear-gradient(0deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05)), #121212;
    box-shadow: 0px 1px 1px rgba(0, 0, 0, 0.14), 0px 2px 1px rgba(0, 0, 0, 0.12), 0px 1px 3px rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    color: #dedede;
}

.card-body {
  max-height: 56px;
}
</style>